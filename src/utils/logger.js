const { EmbedBuilder } = require('discord.js');

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
 * @param {string} type - One of the keys in COLORS
 * @param {Object} fields - { title, description, fields: [{name, value}] }
 */
async function sendLog(client, type, { title, description, fields = [] }) {
  const channelId = process.env.LOG_CHANNEL_ID;
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
