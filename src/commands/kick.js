/**
 * /kick command. Kicks a member from the server with an optional reason.
 * Requires the KickMembers permission. Notifies the target via DM before kicking.
 */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the kick').setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    if (!target.kickable) return interaction.reply({ content: 'I cannot kick this user.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: 'You cannot kick yourself.', ephemeral: true });

    try {
      await target.send(`You have been kicked from **${interaction.guild.name}**.\nReason: ${reason}`).catch(() => {});
      await target.kick(`${reason} | Kicked by ${interaction.user.username}`);

      await interaction.reply({ content: `**${target.user.username}** has been kicked. Reason: ${reason}`, ephemeral: true });

      await sendLog(client, interaction.guildId, 'kick', {
        title: 'Member Kicked',
        fields: [
          { name: 'User',      value: `${target.user.username} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.username,                inline: true },
          { name: 'Reason',    value: reason },
        ],
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: 'Failed to kick the user.', ephemeral: true });
    }
  },
};
