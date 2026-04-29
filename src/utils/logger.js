/**
 * Logging utility. Sends color-coded embeds to the guild's configured log channel.
 * Channel is looked up per-guild from data/guild-configs.json.
 * Exports: sendLog
 */
const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('./guildConfig');

const COLORS = {
  ban:     0xe74c3c,  // red
  kick:    0xe67e22,  // orange
  mute:    0xf1c40f,  // yellow
  unmute:  0x2ecc71,  // green
  warn:    0xe67e22,  // orange
  join:    0x2ecc71,  // green
  leave:   0x95a5a6,  // grey
  delete:  0xe74c3c,  // red
  edit:    0x3498db,  // blue
  automod: 0x9b59b6,  // purple
};

/**
 * Send a structured embed to the guild's log channel.
 * @param {Client} client
 * @param {string} guildId
 * @param {string} type - One of the keys in COLORS
 * @param {Object} payload - { title, description, fields: [{name, value}] }
 */
async function sendLog(client, guildId, type, { title, description, fields = [] }) {
  const config = getConfig(guildId);
  const channelId = config.logChannelId;
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(COLORS[type] ?? 0x99aab5)
    .setTitle(title)
    .setTimestamp();

  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);

  await channel.send({ embeds: [embed] }).catch(console.error);
}

module.exports = { sendLog };
