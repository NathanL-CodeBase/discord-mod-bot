/**
 * Event: messageCreate. Runs auto-moderation checks on every new message.
 * Enforces bad word filtering, link blocking, and sliding-window spam detection
 * with escalating timeouts. Moderators (ManageMessages) bypass all checks.
 */
const { sendLog } = require('../utils/logger');

const SPAM_THRESHOLD = parseInt(process.env.SPAM_THRESHOLD ?? '5', 10);
const SPAM_WINDOW_MS = 5000;
const BAD_WORDS = (process.env.BAD_WORDS ?? '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
const BLOCK_LINKS = process.env.BLOCK_LINKS === 'true';

// Sliding window spam tracker: userId -> timestamp[]
const spamHistory = new Map();

// Escalation tracker: userId -> offense count (resets on bot restart)
const spamOffenses = new Map();

const ESCALATION_TIMEOUTS = [
  60_000,       // 1st offense: 1 minute
  300_000,      // 2nd offense: 5 minutes
  3_600_000,    // 3rd+ offense: 1 hour
];

function getTimeoutMs(userId) {
  const offense = spamOffenses.get(userId) ?? 0;
  const index = Math.min(offense, ESCALATION_TIMEOUTS.length - 1);
  spamOffenses.set(userId, offense + 1);
  return ESCALATION_TIMEOUTS[index];
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // Moderators bypass auto-mod
    if (message.member?.permissions.has('ManageMessages')) return;

    const content = message.content;
    const lower = content.toLowerCase();

    // ── Bad Word Filter ──────────────────────────────────────
    if (BAD_WORDS.length && BAD_WORDS.some(word => lower.includes(word))) {
      await handleViolation(message, client, 'bad_word', 'Your message was removed: Watch yo mouth, hoe.');
      return;
    }

    // ── Link Filter ──────────────────────────────────────────
    if (BLOCK_LINKS && /https?:\/\/[^\s]+/i.test(content)) {
      await handleViolation(message, client, 'link', 'Your message was removed: links are not allowed.');
      return;
    }

    // ── Spam Detection (sliding window) ──────────────────────
    const now = Date.now();
    const userId = message.author.id;
    const timestamps = spamHistory.get(userId) ?? [];

    // Prune entries outside the window, then add current timestamp
    const pruned = timestamps.filter(t => now - t < SPAM_WINDOW_MS);
    pruned.push(now);
    spamHistory.set(userId, pruned);

    if (pruned.length >= SPAM_THRESHOLD) {
      spamHistory.set(userId, []);

      await handleViolation(message, client, 'spam', 'Slow down! You are sending messages too fast.');

      if (message.member?.moderatable) {
        const timeoutMs = getTimeoutMs(userId);
        const offense = spamOffenses.get(userId);
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
