// --- Permission Checks ---
// Verifies if token's role can perform action
const { loadConfig } = require('./configLoader');

function hasPermission(role, permission, filePath = null) {
    const config = loadConfig();
    const perms = config.permissions?.[role] || {};
    if (filePath) {
        for (const key of Object.keys(perms)) {
            if (key.startsWith('container.files.directory.')) {
                const match = key.match(/container\.files\.directory\\\"(.+)\\\"\.(.+)/);
                if (match) {
                    const [_, pattern, perm] = match;
                    if (permission.endsWith(perm) && pathMatch(filePath, pattern)) {
                        return perms[key];
                    }
                }
            }
        }
    }
    if (perms[permission] === true) return true;
    if (perms[permission] === false) return false;
    const permParts = permission.split('.');
    for (let i = permParts.length - 1; i > 0; i--) {
        const wildcard = permParts.slice(0, i).join('.') + '.*';
        if (perms[wildcard] === true) return true;
        if (perms[wildcard] === false) return false;
    }
    return false;
}

function pathMatch(filePath, pattern) {
    filePath = filePath.replace(/\\/g, '/');
    pattern = pattern.replace(/\\/g, '/');
    if (pattern.endsWith('/*')) {
        return filePath.startsWith(pattern.slice(0, -1));
    }
    return filePath === pattern;
}

module.exports = {
    hasPermission,
};
