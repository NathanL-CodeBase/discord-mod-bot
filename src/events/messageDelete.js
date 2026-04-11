const { sendLog } = require('../utils/logger');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (message.partial || message.author?.bot) return;

    await sendLog(client, 'delete', {
      title: 'Message Deleted',
      fields: [
        { name: 'Author', value: `${message.author.username} (${message.author.id})`, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Content', value: message.content?.substring(0, 1024) || '*empty or unknown*' },
      ],
    });
  },
};
