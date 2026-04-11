/**
 * Event: interactionCreate. Routes incoming slash command interactions to their handlers.
 * Ignores non-chat-input interactions and sends a fallback error reply on failure.
 */
module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`Error in command "${interaction.commandName}":`, err);
      const msg = { content: 'An error occurred while executing this command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  },
};
