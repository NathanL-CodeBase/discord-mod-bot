/**
 * Deploys slash commands globally via the Discord REST API.
 * Global commands are available in all servers the bot has joined.
 * Note: global commands can take up to 1 hour to propagate after first deploy.
 *
 * Usage: node src/deploy-commands.js
 * Requires: BOT_TOKEN, CLIENT_ID in .env
 */
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash command(s) globally...`);
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Slash commands registered globally. Changes may take up to 1 hour to appear in all servers.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
})();
