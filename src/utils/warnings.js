const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/warnings.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}');

function loadWarnings() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveWarnings(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Add a warning for a user in a guild.
 * Returns the updated list of warnings for that user.
 */
function addWarning(guildId, userId, reason, moderatorId) {
  const data = loadWarnings();
  if (!data[guildId]) data[guildId] = {};
  if (!data[guildId][userId]) data[guildId][userId] = [];

  const warning = {
    id: Date.now().toString(),
    reason,
    moderatorId,
    timestamp: new Date().toISOString(),
  };
  data[guildId][userId].push(warning);
  saveWarnings(data);
  return data[guildId][userId];
}

/**
 * Get all warnings for a user in a guild.
 */
function getWarnings(guildId, userId) {
  const data = loadWarnings();
  return data?.[guildId]?.[userId] ?? [];
}

/**
 * Clear all warnings for a user in a guild.
 */
function clearWarnings(guildId, userId) {
  const data = loadWarnings();
  if (data?.[guildId]) delete data[guildId][userId];
  saveWarnings(data);
}

module.exports = { addWarning, getWarnings, clearWarnings };
