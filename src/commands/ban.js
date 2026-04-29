/**
 * /ban command. Bans a member from the server, optionally deleting recent messages.
 * Requires the BanMembers permission. Notifies the target via DM before banning.
 */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .addIntegerOption(opt =>
      opt.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7).setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') ?? 0;

    if (!target) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: 'I cannot ban this user (they may have higher permissions than me).', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: 'You cannot ban yourself.', ephemeral: true });

    try {
      await target.send(`You have been banned from **${interaction.guild.name}**.\nReason: ${reason}`).catch(() => {});
      await target.ban({ reason: `${reason} | Banned by ${interaction.user.username}`, deleteMessageSeconds: deleteDays * 86400 });

      await interaction.reply({ content: `**${target.user.username}** has been banned. Reason: ${reason}`, ephemeral: true });

      await sendLog(client, interaction.guildId, 'ban', {
        title: 'Member Banned',
        fields: [
          { name: 'User',      value: `${target.user.username} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.username,                inline: true },
          { name: 'Reason',    value: reason },
        ],
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: 'Failed to ban the user.', ephemeral: true });
    }
  },
};
