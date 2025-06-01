// --- Utils ---
// Common utilities (size conversion, path, token, etc.)
function toBytes(size) {
    if (!size || size === 'unlimited') return Number.MAX_SAFE_INTEGER;
    const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
    const match = String(size).toUpperCase().match(/(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)/);
    if (!match) return parseInt(size, 10) || 0;
    const value = parseFloat(match[1]);
    const unit = match[2];
    return Math.round(value * (units[unit] || 1));
}

module.exports = {
    toBytes,
};
