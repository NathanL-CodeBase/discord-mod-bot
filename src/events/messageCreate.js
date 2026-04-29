/**
 * Event: messageCreate. Runs auto-moderation checks on every new message.
 * Enforces bad word filtering, link blocking, and sliding-window spam detection
 * with escalating timeouts. Moderators (ManageMessages) bypass all checks.
 *
 * Bad words: global list from BAD_WORDS env + per-guild extraBadWords from guild config.
 * All other settings (blockLinks, spamThreshold) are per-guild with env-var fallbacks.
 */
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
  60_000,       // 1st offense: 1 minute
  300_000,      // 2nd offense: 5 minutes
  3_600_000,    // 3rd+ offense: 1 hour
];

function getTimeoutMs(trackKey) {
  const offense = spamOffenses.get(trackKey) ?? 0;
  const index = Math.min(offense, ESCALATION_TIMEOUTS.length - 1);
  spamOffenses.set(trackKey, offense + 1);
  return ESCALATION_TIMEOUTS[index];
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // Moderators bypass auto-mod
    if (message.member?.permissions.has('ManageMessages')) return;

    const guildId = message.guild.id;
    const config = getConfig(guildId);

    const allBadWords = [...GLOBAL_BAD_WORDS, ...(config.extraBadWords ?? [])];
    const blockLinks = config.blockLinks ?? false;
    const spamThreshold = config.spamThreshold ?? parseInt(process.env.SPAM_THRESHOLD ?? '5', 10);

    const content = message.content;
    const lower = content.toLowerCase();

    // ── Bad Word Filter ──────────────────────────────────────
    if (allBadWords.length && allBadWords.some(word => lower.includes(word))) {
      await handleViolation(message, client, 'bad_word', 'Your message was removed: Watch yo mouth...Hoe.');
      return;
    }

    // ── Link Filter ──────────────────────────────────────────
    if (blockLinks && /https?:\/\/[^\s]+/i.test(content)) {
      await handleViolation(message, client, 'link', 'Your message was removed: links are not allowed.');
      return;
    }

    // ── Spam Detection (sliding window) ──────────────────────
    const now = Date.now();
    const trackKey = `${guildId}:${message.author.id}`;
    const timestamps = spamHistory.get(trackKey) ?? [];

    // Prune entries outside the window, then add current timestamp
    const pruned = timestamps.filter(t => now - t < SPAM_WINDOW_MS);
    pruned.push(now);
    spamHistory.set(trackKey, pruned);

    if (pruned.length >= spamThreshold) {
      spamHistory.set(trackKey, []);

      await handleViolation(message, client, 'spam', 'Slow down! You are sending messages too fast.');

      if (message.member?.moderatable) {
        const timeoutMs = getTimeoutMs(trackKey);
        const offense = spamOffenses.get(trackKey);
        await message.member.timeout(timeoutMs, `Auto-mod: spam detected (offense #${offense})`).catch(() => {});
      }
    }
  },
};

/**
 * Deletes a violating message, sends a temporary warning in the channel, and logs the event.
 * @param {Message} message - The offending message
 * @param {Client} client
 * @param {'bad_word'|'link'|'spam'} type - Violation type
 * @param {string} warningText - Text sent to the channel as a temporary warning
 */
async function handleViolation(message, client, type, warningText) {
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

  await sendLog(client, 'automod', {
    title: `Auto-Mod: ${typeLabels[type] ?? type}`,
    fields: [
      { name: 'User',    value: `${message.author.username} (${message.author.id})`, inline: true },
      { name: 'Channel', value: `<#${message.channel.id}>`,                          inline: true },
      { name: 'Message', value: message.content?.substring(0, 1024) || '*empty*' },
    ],
  });
}
