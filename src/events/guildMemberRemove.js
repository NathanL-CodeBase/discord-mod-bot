/**
 * Event: guildMemberRemove. Fires when a user leaves or is removed from the guild.
 * Logs the departure along with the roles the member held.
 */
const { sendLog } = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const roles = member.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => r.name)
      .join(', ') || 'None';

    await sendLog(client, member.guild.id, 'leave', {
      title: 'Member Left',
      fields: [
        { name: 'User', value: `${member.user.username} (${member.id})`, inline: true },
        { name: 'Roles', value: roles },
      ],
    });
  },
};
