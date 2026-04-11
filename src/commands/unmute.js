/**
 * /unmute command. Removes an active timeout from a member.
 * Requires the ModerateMembers permission. Only works if the user is currently timed out.
 */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a timeout (unmute) from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to unmute').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for unmuting').setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target) return interaction.reply({ content: 'User not found.', ephemeral: true });
    if (!target.isCommunicationDisabled()) return interaction.reply({ content: 'This user is not currently muted.', ephemeral: true });

    try {
      await target.timeout(null, `${reason} | Unmuted by ${interaction.user.username}`);
      await interaction.reply({ content: `**${target.user.username}** has been unmuted.`, ephemeral: true });

      await sendLog(client, 'unmute', {
        title: 'Member Unmuted',
        fields: [
          { name: 'User',      value: `${target.user.username} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.username,                inline: true },
          { name: 'Reason',    value: reason },
        ],
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: 'Failed to unmute the user.', ephemeral: true });
    }
  },
};
