const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages from a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to delete (1–100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true))
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Only delete messages from this user (optional)')
        .setRequired(false)),

  async execute(interaction, client) {
    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    // Fetch messages — Discord requires fetching before filtering
    const fetched = await interaction.channel.messages.fetch({ limit: 100 }).catch(() => null);

    if (!fetched) {
      return interaction.editReply({ content: '❌ Failed to fetch messages.' });
    }

    // Filter by user if specified, then cap to requested amount
    let toDelete = targetUser
      ? fetched.filter(m => m.author.id === targetUser.id)
      : fetched;

    toDelete = toDelete.first(amount);

    // Discord only allows bulk-delete for messages under 14 days old
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const deletable = toDelete.filter(m => m.createdTimestamp > twoWeeksAgo);
    const tooOld = toDelete.length - deletable.length;

    if (deletable.length === 0) {
      return interaction.editReply({
        content: '❌ No deletable messages found. Messages older than 14 days cannot be bulk deleted (Discord limitation).',
      });
    }

    const deleted = await interaction.channel.bulkDelete(deletable, true).catch(() => null);

    if (!deleted) {
      return interaction.editReply({ content: '❌ Failed to delete messages.' });
    }

    const summary = targetUser
      ? `🗑️ Deleted **${deleted.size}** message(s) from **${targetUser.tag}** in <#${interaction.channel.id}>.`
      : `🗑️ Deleted **${deleted.size}** message(s) in <#${interaction.channel.id}>.`;

    const ageWarning = tooOld > 0
      ? `\n⚠️ ${tooOld} message(s) were skipped — older than 14 days.`
      : '';

    await interaction.editReply({ content: summary + ageWarning });

    await sendLog(client, interaction.guildId, 'delete', {
      title: '🗑️ Purge Executed',
      fields: [
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
        { name: 'Deleted', value: `${deleted.size} message(s)`, inline: true },
        ...(targetUser ? [{ name: 'Filtered to User', value: targetUser.tag, inline: true }] : []),
        ...(tooOld > 0 ? [{ name: 'Skipped (too old)', value: `${tooOld}`, inline: true }] : []),
      ],
    });
  },
};
