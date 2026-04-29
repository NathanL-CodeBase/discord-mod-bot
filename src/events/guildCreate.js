/**
 * Event: guildCreate. Fires when the bot joins a new guild.
 * Alerts the server owner (via DM) or the system channel with setup instructions.
 */
module.exports = {
  name: 'guildCreate',
  async execute(guild) {
    const setupMessage = [
      `Thanks for adding me to **${guild.name}**! Here's how to get started:`,
      '',
      '`/setup log-channel`      — Set the channel where mod-log messages are sent',
      '`/setup add-bad-words`    — Add server-specific banned words (on top of the global list)',
      '`/setup view-bad-words`   — View global and server-specific banned word lists',
      '`/setup clear-bad-words`  — Remove all server-specific banned words',
      '`/setup block-links`      — Enable or disable link blocking',
      '`/setup spam-threshold`   — Set how many messages in 5 s triggers spam detection',
      '`/setup view`             — View the current configuration for this server',
      '',
      'Until a log channel is set, all moderation actions still work but will not be logged.',
    ].join('\n');

    const owner = await guild.fetchOwner().catch(() => null);
    if (owner) {
      const sent = await owner.send(setupMessage).catch(() => null);
      if (sent) return;
    }

    // Fall back to system channel if DM fails
    if (guild.systemChannel) {
      await guild.systemChannel.send(setupMessage).catch(() => {});
    }
  },
};
