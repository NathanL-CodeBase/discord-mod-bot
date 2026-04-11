const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../utils/logger');

const DURATION_MAP = {
  '60':     { ms: 60_000,         label: '1 minute'   },
  '300':    { ms: 300_000,        label: '5 minutes'  },
  '600':    { ms: 600_000,        label: '10 minutes' },
  '1800':   { ms: 1_800_000,      label: '30 minutes' },
  '3600':   { ms: 3_600_000,      label: '1 hour'     },
  '86400':  { ms: 86_400_000,     label: '24 hours'   },
  '604800': { ms: 604_800_000,    label: '7 days'     },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to mute').setRequired(true))
    .addStringOption(opt =>
      opt.setName('duration')
        .setDescription('Duration of the mute')
        .setRequired(true)
        .addChoices(
          { name: '1 minute',   value: '60'     },
          { name: '5 minutes',  value: '300'    },
          { name: '10 minutes', value: '600'    },
          { name: '30 minutes', value: '1800'   },
          { name: '1 hour',     value: '3600'   },
          { name: '24 hours',   value: '86400'  },
          { name: '7 days',     value: '604800' },
        ))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the mute').setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getMember('user');
    const durationKey = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const { ms: durationMs, label: durationLabel } = DURATION_MAP[durationKey];

    if (!target) return interaction.reply({ content: 'User not found.', ephemeral: true });
    if (!target.moderatable) return interaction.reply({ content: 'I cannot mute this user.', ephemeral: true });

    try {
      await target.timeout(durationMs, `${reason} | Muted by ${interaction.user.username}`);
      await interaction.reply({ content: `**${target.user.username}** has been muted for ${durationLabel}. Reason: ${reason}`, ephemeral: true });

      await sendLog(client, 'mute', {
        title: 'Member Muted',
        fields: [
          { name: 'User',      value: `${target.user.username} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.username,                inline: true },
          { name: 'Duration',  value: durationLabel,                            inline: true },
          { name: 'Reason',    value: reason },
        ],
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: 'Failed to mute the user.', ephemeral: true });
    }
  },
};
