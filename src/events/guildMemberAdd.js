/**
 * Event: guildMemberAdd. Fires when a user joins the guild.
 * Logs the join with account age and flags accounts newer than 7 days.
 */
const { sendLog } = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
    const isNew = accountAge < 7;

    await sendLog(client, member.guild.id, 'join', {
      title: 'Member Joined',
      description: isNew ? 'WARNING: New account (less than 7 days old)' : undefined,
      fields: [
        { name: 'User', value: `${member.user.username} (${member.id})`, inline: true },
        { name: 'Account Age', value: `${accountAge} day(s)`, inline: true },
        { name: 'Member Count', value: String(member.guild.memberCount), inline: true },
      ],
    });
  },
};
