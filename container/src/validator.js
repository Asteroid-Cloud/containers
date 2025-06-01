// --- Validator ---
// Validates sizes, paths, permissions
const fs = require('fs');
const path = require('path');

function getTotalUsedSpace(dir) {
    let total = 0;
    if (!fs.existsSync(dir)) return 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            total += getTotalUsedSpace(full);
        } else {
            total += stat.size;
        }
    }
    return total;
}

function isValidPath(absPath, root) {
    const rel = path.relative(root, absPath);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
}

function normalizePath(p) {
    return p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

module.exports = {
    getTotalUsedSpace,
    isValidPath,
    normalizePath,
};
