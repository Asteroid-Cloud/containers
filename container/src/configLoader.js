// --- Config Loader ---
// Loads and parses container.config.json

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'container.config.json');

function loadConfig() {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
}

module.exports = { loadConfig };
