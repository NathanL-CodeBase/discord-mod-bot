const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getWarnings, clearWarnings } = require('../utils/warnings');
const { sendLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View or clear warnings for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to check').setRequired(true))
    .addBooleanOption(opt =>
      opt.setName('clear').setDescription('Clear all warnings for this user?').setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getMember('user');
    const shouldClear = interaction.options.getBoolean('clear') ?? false;

    if (!target) return interaction.reply({ content: 'User not found.', ephemeral: true });

    if (shouldClear) {
      const existing = getWarnings(interaction.guild.id, target.id);
      clearWarnings(interaction.guild.id, target.id);

      await interaction.reply({ content: `Cleared all warnings for **${target.user.username}**.`, ephemeral: true });

      await sendLog(client, 'warn', {
        title: 'Warnings Cleared',
        fields: [
          { name: 'User',      value: `${target.user.username} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.username,                inline: true },
          { name: 'Cleared',   value: String(existing.length),                  inline: true },
        ],
      });

      return;
    }

    const warnings = getWarnings(interaction.guild.id, target.id);

    if (warnings.length === 0) {
      return interaction.reply({ content: `**${target.user.username}** has no warnings.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Warnings for ${target.user.username}`)
      .setColor(0xe67e22)
      .setDescription(`**${warnings.length}** total warning(s)`)
      .addFields(
        warnings.slice(-10).map((w, i) => ({
          name:  `Warning #${i + 1} — ${new Date(w.timestamp).toLocaleDateString()}`,
          value: `**Reason:** ${w.reason}\n**By:** <@${w.moderatorId}>`,
        }))
      )
      .setFooter({ text: warnings.length > 10 ? 'Showing last 10 warnings' : '' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
