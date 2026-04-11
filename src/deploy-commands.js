/**
 * Deploys slash commands to a specific Discord guild via the REST API.
 * Reads all command files from src/commands/ and registers them.
 *
 * Usage: node src/deploy-commands.js
 * Requires: BOT_TOKEN, CLIENT_ID, GUILD_ID in .env
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
    console.log(`Registering ${commands.length} slash command(s) to guild ${process.env.GUILD_ID}...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registered successfully.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
})();
