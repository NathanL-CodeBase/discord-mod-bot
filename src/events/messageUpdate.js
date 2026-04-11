const { sendLog } = require('../utils/logger');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (oldMessage.partial || newMessage.partial) return;
    if (oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    await sendLog(client, 'edit', {
      title: 'Message Edited',
      fields: [
        { name: 'Author', value: `${oldMessage.author.username} (${oldMessage.author.id})`, inline: true },
        { name: 'Channel', value: `<#${oldMessage.channel.id}>`, inline: true },
        { name: 'Before', value: oldMessage.content?.substring(0, 1024) || '*empty*' },
        { name: 'After', value: newMessage.content?.substring(0, 1024) || '*empty*' },
      ],
    });
  },
};
