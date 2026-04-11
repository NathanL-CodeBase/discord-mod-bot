/**
 * Event: ready (once). Fires when the bot successfully connects to Discord.
 * Logs the bot tag and guild count, then sets the bot's activity status.
 */
const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Serving ${client.guilds.cache.size} guild(s)`);
    client.user.setActivity('your server', { type: ActivityType.Watching });
  },
};
