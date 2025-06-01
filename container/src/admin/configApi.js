// --- Admin Config API ---
// Endpoints for editing and reloading container.config.json (admin only)
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../configLoader');

const CONFIG_PATH = path.join(__dirname, '../..', 'container.config.json');

let configCache = loadConfig();

function isAdminRole(role) {
    const config = loadConfig();
    return config.permissions?.[role]?.['container.administrator'] === true;
}

function getConfigCache() {
    return configCache;
}

function reloadConfig() {
    configCache = loadConfig();
    return configCache;
}

function updateConfig(newConfig) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 4), 'utf-8');
    reloadConfig();
}

module.exports = {
    isAdminRole,
    getConfigCache,
    reloadConfig,
    updateConfig,
};
