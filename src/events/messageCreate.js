const { sendLog } = require('../utils/logger');
const { getConfig } = require('../utils/guildConfig');

const GLOBAL_BAD_WORDS = (process.env.BAD_WORDS ?? '')
  .split(',')
  .map(w => w.trim().toLowerCase())
  .filter(Boolean);

const SPAM_WINDOW_MS = 5000;

// Sliding window spam tracker: `guildId:userId` -> timestamp[]
const spamHistory = new Map();

// Escalation tracker: `guildId:userId` -> offense count (resets on bot restart)
const spamOffenses = new Map();

const ESCALATION_TIMEOUTS = [
  60_000,     // 1st offense: 1 minute
  300_000,    // 2nd offense: 5 minutes
  3_600_000,  // 3rd+ offense: 1 hour
];

function getTimeoutMs(trackKey) {
  const offense = spamOffenses.get(trackKey) ?? 0;
  const index = Math.min(offense, ESCALATION_TIMEOUTS.length - 1);
  spamOffenses.set(trackKey, offense + 1);
  return ESCALATION_TIMEOUTS[index];
}

// Collapses leet-speak substitutions to plain text before matching.
// Handles: @->a, !->i, $->s, 0->o, 1->i, 3->e, 4->a, 5->s, 7->t, 9->g
// Does NOT strip * so the fuzzy pattern can handle f*ck-style evasion separately.
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/!/g, 'i')
    .replace(/\$/g, 's')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/9/g, 'g')
    .replace(/\s+/g, ' ')
    .trim();
}

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Catches character-replacement evasions: f*ck, f.u.c.k, h-a-t-e, etc.
// Each letter position in the word may match the correct letter OR any non-alpha, non-space symbol.
// Uses lookbehind/lookahead instead of \b because the match may start/end with a non-word char.
function buildFuzzyPattern(word) {
  const pattern = word.split('').map(c => `(?:${escapeRegex(c)}|[^a-z\\s])`).join('');
  return new RegExp(`(?<![a-z\\d])${pattern}(?![a-z\\d])`, 'i');
}

function buildPatterns(word) {
  return {
    rawPattern:   new RegExp(`\\b${escapeRegex(word)}\\b`, 'i'),
    normPattern:  new RegExp(`\\b${escapeRegex(normalize(word))}\\b`, 'i'),
    fuzzyPattern: buildFuzzyPattern(word),
  };
}

// Global patterns compiled once at startup — no per-message regex allocation.
const GLOBAL_BAD_WORD_PATTERNS = GLOBAL_BAD_WORDS.map(buildPatterns);

// Guild-specific patterns rebuilt per-message so /setup additions take effect without a restart.
function buildExtraPatterns(extraWords) {
  return extraWords.map(buildPatterns);
}

// Tests raw content, leet-normalized content, and fuzzy (symbol-substituted) content.
function matchesAny(content, patterns) {
  const normalizedContent = normalize(content);
  return patterns.some(({ rawPattern, normPattern, fuzzyPattern }) =>
    rawPattern.test(content) || normPattern.test(normalizedContent) || fuzzyPattern.test(content)
  );
}

// Module-level constant — no /g flag so .test() never has stale lastIndex state.
const LINK_REGEX = /https?:\/\/[^\s]+/i;

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // Moderators bypass all auto-mod checks.
    if (message.member?.permissions.has('ManageMessages')) return;

    const guildId = message.guild.id;
    const config  = getConfig(guildId);

    const allPatterns   = [...GLOBAL_BAD_WORD_PATTERNS, ...buildExtraPatterns(config.extraBadWords ?? [])];
    const blockLinks    = config.blockLinks    ?? (process.env.BLOCK_LINKS === 'true');
    const spamThreshold = config.spamThreshold ?? parseInt(process.env.SPAM_THRESHOLD ?? '5', 10);

    // Capture content before any async delete so handleViolation always has it.
    const content = message.content;

    // ── Bad Word Filter ──────────────────────────────────────────────────────
    if (allPatterns.length && matchesAny(content, allPatterns)) {
      await handleViolation(message, client, 'bad_word', 'Your message was removed: Watch yo mouth...Hoe.', content);
      return;
    }

    // ── Link Filter ──────────────────────────────────────────────────────────
    if (blockLinks && LINK_REGEX.test(content)) {
      await handleViolation(message, client, 'link', 'Your message was removed: links are not allowed.', content);
      return;
    }

    // ── Spam Detection (sliding window) ─────────────────────────────────────
    const now      = Date.now();
    const trackKey = `${guildId}:${message.author.id}`;
    const timestamps = spamHistory.get(trackKey) ?? [];

    const pruned = timestamps.filter(t => now - t < SPAM_WINDOW_MS);
    pruned.push(now);
    spamHistory.set(trackKey, pruned);

    if (pruned.length >= spamThreshold) {
      spamHistory.set(trackKey, []);

      await handleViolation(message, client, 'spam', 'Slow down! You are sending messages too fast.', content);

      if (message.member?.moderatable) {
        const timeoutMs = getTimeoutMs(trackKey);
        const offense   = spamOffenses.get(trackKey);
        await message.member.timeout(timeoutMs, `Auto-mod: spam detected (offense #${offense})`).catch(() => {});
      }
    }
  },
};

// content is passed explicitly so it is captured before message.delete() clears it from the object.
async function handleViolation(message, client, type, warningText, content) {
  const typeLabels = {
    bad_word: 'Bad Word Detected',
    link:     'Link Blocked',
    spam:     'Spam Detected',
  };

  await message.delete().catch(() => {});

  const warning = await message.channel
    .send(`<@${message.author.id}> ${warningText}`)
    .catch(() => null);

  if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);

  await sendLog(client, message.guild.id, 'automod', {
    title: `Auto-Mod: ${typeLabels[type] ?? type}`,
    fields: [
      { name: 'User',    value: `${message.author.username} (${message.author.id})`, inline: true },
      { name: 'Channel', value: `<#${message.channel.id}>`,                          inline: true },
      { name: 'Reason',  value: typeLabels[type] ?? type,                             inline: true },
      { name: 'Message', value: content?.substring(0, 1024) || '*empty*' },
    ],
  });
}
