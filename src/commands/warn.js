/**
 * /warn command. Issues a warning to a member and stores it persistently.
 * Requires the ModerateMembers permission. Notifies the target via DM with their total warning count.
 */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addWarning } = require('../utils/warnings');
const { sendLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the warning').setRequired(true)),

  async execute(interaction, client) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason');

    if (!target) return interaction.reply({ content: 'User not found.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: 'You cannot warn yourself.', ephemeral: true });

    const warnings = addWarning(interaction.guild.id, target.id, reason, interaction.user.id);

    await target.send(
      `You have received a warning in **${interaction.guild.name}**.\nReason: ${reason}\nYou now have **${warnings.length}** warning(s).`
    ).catch(() => {});

    await interaction.reply({
      content: `**${target.user.username}** has been warned. They now have **${warnings.length}** warning(s).`,
      ephemeral: true,
    });

    await sendLog(client, interaction.guildId, 'warn', {
      title: 'Member Warned',
      fields: [
        { name: 'User',           value: `${target.user.username} (${target.id})`, inline: true },
        { name: 'Moderator',      value: interaction.user.username,                inline: true },
        { name: 'Total Warnings', value: String(warnings.length),                  inline: true },
        { name: 'Reason',         value: reason },
      ],
    });
  },
};
