/**
 * Per-guild configuration utility. Reads and writes guild settings to data/guild-configs.json.
 * Each guild gets its own config block keyed by guild ID.
 *
 * The full config object is cached in memory after the first read so that the disk is not hit
 * on every message across every server. The cache is updated synchronously on every write, so
 * /setup changes take effect immediately without a restart. Manual edits to guild-configs.json
 * while the bot is running will not be picked up until restart.
 */
const fs   = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../data/guild-configs.json');

// null = not yet loaded. Populated on first access, kept in sync with every write.
let cache = null;

function loadAll() {
  if (cache !== null) return cache;
  if (!fs.existsSync(CONFIG_PATH)) {
    cache = {};
    return cache;
  }
  try {
    cache = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    cache = {};
  }
  return cache;
}

function saveAll(configs) {
  cache = configs;
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
 * Sets a single key on a guild's config, updates the cache, and persists to disk.
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
