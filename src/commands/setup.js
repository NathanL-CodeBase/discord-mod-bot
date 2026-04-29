/**
 * /setup command. Configures the bot for the current server.
 * Settings are stored per-guild in data/guild-configs.json.
 * Requires Administrator permission.
 */
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { getConfig, setConfigKey } = require('../utils/guildConfig');

const GLOBAL_BAD_WORDS = (process.env.BAD_WORDS ?? '')
  .split(',')
  .map(w => w.trim().toLowerCase())
  .filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure the bot for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('log-channel')
        .setDescription('Set the channel where mod-log messages are sent')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('The text channel to send mod logs to')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('add-bad-words')
        .setDescription('Add words to this server\'s banned word list (in addition to global words)')
        .addStringOption(opt =>
          opt.setName('words')
            .setDescription('Comma-separated words to add')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('clear-bad-words')
        .setDescription('Clear this server\'s extra banned word list (global list is not affected)'))
    .addSubcommand(sub =>
      sub.setName('view-bad-words')
        .setDescription('Show the global and server-specific banned word lists separately'))
    .addSubcommand(sub =>
      sub.setName('block-links')
        .setDescription('Enable or disable link blocking for this server')
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('Block HTTP/HTTPS links in messages?')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('spam-threshold')
        .setDescription('Set how many messages in 5 seconds triggers spam detection')
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Message count threshold (default: 5)')
            .setMinValue(2)
            .setMaxValue(20)
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('Show the current bot configuration for this server')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const config = getConfig(guildId);

    if (sub === 'log-channel') {
      const channel = interaction.options.getChannel('channel');
      setConfigKey(guildId, 'logChannelId', channel.id);
      return interaction.reply({ content: `Mod-log channel set to <#${channel.id}>.`, ephemeral: true });
    }

    if (sub === 'add-bad-words') {
      const incoming = interaction.options.getString('words')
        .split(',')
        .map(w => w.trim().toLowerCase())
        .filter(Boolean);

      const existing = config.extraBadWords ?? [];
      const combined = [...new Set([...existing, ...incoming])];
      setConfigKey(guildId, 'extraBadWords', combined);

      const added = incoming.filter(w => !existing.includes(w));
      const skipped = incoming.length - added.length;

      let msg = `Added **${added.length}** word(s) to this server's banned list.`;
      if (skipped > 0) msg += ` (${skipped} already present, skipped)`;
      return interaction.reply({ content: msg, ephemeral: true });
    }

    if (sub === 'clear-bad-words') {
      const count = (config.extraBadWords ?? []).length;
      setConfigKey(guildId, 'extraBadWords', []);
      return interaction.reply({
        content: `Cleared **${count}** server-specific word(s). The global list is unchanged.`,
        ephemeral: true,
      });
    }

    if (sub === 'view-bad-words') {
      const extraWords = config.extraBadWords ?? [];

      const globalValue = GLOBAL_BAD_WORDS.length
        ? `\`${GLOBAL_BAD_WORDS.join('`, `')}\``
        : '*None configured*';

      const serverValue = extraWords.length
        ? `\`${extraWords.join('`, `')}\``
        : '*None added*';

      const embed = new EmbedBuilder()
        .setTitle('Banned Word Lists')
        .setColor(0x9b59b6)
        .addFields(
          { name: `Global Words (${GLOBAL_BAD_WORDS.length})`, value: globalValue },
          { name: `Server-Specific Words (${extraWords.length})`, value: serverValue },
        )
        .setFooter({ text: 'Both lists are enforced together. Use /setup add-bad-words to add server words.' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'block-links') {
      const enabled = interaction.options.getBoolean('enabled');
      setConfigKey(guildId, 'blockLinks', enabled);
      return interaction.reply({
        content: `Link blocking **${enabled ? 'enabled' : 'disabled'}** for this server.`,
        ephemeral: true,
      });
    }

    if (sub === 'spam-threshold') {
      const amount = interaction.options.getInteger('amount');
      setConfigKey(guildId, 'spamThreshold', amount);
      return interaction.reply({
        content: `Spam threshold set to **${amount}** messages per 5 seconds.`,
        ephemeral: true,
      });
    }

    if (sub === 'view') {
      const logChannel = config.logChannelId ? `<#${config.logChannelId}>` : '*Not set*';
      const extraWordCount = (config.extraBadWords ?? []).length;
      const blockLinks = config.blockLinks ?? false;
      const spamThreshold = config.spamThreshold ?? parseInt(process.env.SPAM_THRESHOLD ?? '5', 10);

      const embed = new EmbedBuilder()
        .setTitle(`Bot Config: ${interaction.guild.name}`)
        .setColor(0x3498db)
        .addFields(
          { name: 'Mod-Log Channel', value: logChannel, inline: true },
          { name: 'Link Blocking',   value: blockLinks ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Spam Threshold',  value: `${spamThreshold} msg / 5s`, inline: true },
          { name: 'Global Bad Words',         value: String(GLOBAL_BAD_WORDS.length), inline: true },
          { name: 'Server-Specific Bad Words', value: String(extraWordCount), inline: true },
        )
        .setFooter({ text: 'Use /setup view-bad-words to see the full word lists.' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
