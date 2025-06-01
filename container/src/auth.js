// --- Auth Token Generation ---
// Handles /api/auth/request-token
const crypto = require('crypto');
const { loadConfig } = require('./configLoader');

const tokens = new Map();

function generateToken(role) {
    return crypto.randomBytes(32).toString('hex');
}

function requestToken(req, res) {
    const { role, adminKey } = req.body || {};
    const config = loadConfig();
    const validRoles = config.roles || [];
    const adminPerms = config.permissions && config.permissions.admin;
    const requiredAdminKey = process.env.ADMIN_KEY || 'admin123'; // Please change this

    if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ code: 400, success: false, message: 'Invalid or missing role.' });
    }
    if (role === 'admin' && adminKey !== requiredAdminKey) {
        return res.status(403).json({ code: 403, success: false, message: 'Invalid admin key.' });
    }
    if (role !== 'admin' && adminKey !== requiredAdminKey) {
        return res.status(403).json({ code: 403, success: false, message: 'Admin key required.' });
    }
    const token = generateToken(role);
    tokens.set(token, { role, created: Date.now() });
    return res.json({ code: 200, success: true, token });
}

function getRoleFromToken(token) {
    const entry = tokens.get(token);
    return entry ? entry.role : null;
}

module.exports = {
    requestToken,
    getRoleFromToken,
};
