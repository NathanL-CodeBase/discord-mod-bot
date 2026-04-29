/**
 * Per-guild configuration utility. Reads and writes guild settings to data/guild-configs.json.
 * Each guild gets its own config block keyed by guild ID.
 */
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../data/guild-configs.json');

function loadAll() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveAll(configs) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(configs, null, 2));
}

/**
 * Returns the config object for a guild, or {} if none exists.
 * @param {string} guildId
 */
function getConfig(guildId) {
  return loadAll()[guildId] ?? {};
}

/**
 * Sets a single key on a guild's config and persists to disk.
 * @param {string} guildId
 * @param {string} key
 * @param {*} value
 * @returns {Object} The updated guild config
 */
function setConfigKey(guildId, key, value) {
  const all = loadAll();
  if (!all[guildId]) all[guildId] = {};
  all[guildId][key] = value;
  saveAll(all);
  return all[guildId];
}

module.exports = { getConfig, setConfigKey };
