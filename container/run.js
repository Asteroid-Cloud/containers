// --- Imports & Setup ---
const express = require('express');
const path = require('path');
const { loadConfig } = require('./src/configLoader');
const { requestToken, getRoleFromToken } = require('./src/auth');
const { hasPermission } = require('./src/permission');
const { uploadFile, deleteFile, listFiles } = require('./src/fileManager');
const { isAdminRole, getConfigCache, reloadConfig, updateConfig } = require('./src/admin/configApi');
const cors = require('cors');

// --- Load Configuration ---
const config = loadConfig();
const PORT = config.port || 8080;

// --- Express App ---
const app = express();
app.use(express.json());

// --- CORS Setup ---
const allowed = config.allowedRequestDomains || ["*"];
const denied = config.deniedRequestDomains || [];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (denied.includes(origin)) return callback(new Error('CORS denied by config'), false);
    if (allowed.includes("*")) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed'), false);
  }
}));

// --- Token Middleware ---
function authMiddleware(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ code: 401, success: false, message: 'Missing token.' });
    }
    const role = getRoleFromToken(token);
    if (!role) {
        return res.status(401).json({ code: 401, success: false, message: 'Invalid or expired token.' });
    }
    req.role = role;
    req.token = token;
    next();
}

// --- Mount APIs ---
app.post('/api/auth/request-token', requestToken);

// --- File API Stubs ---
app.post('/api/files/upload', authMiddleware, (req, res) => {
    const { file, path: relPath } = req.body || {};
    if (!file || !relPath) {
        return res.status(400).json({ code: 400, success: false, message: 'Missing file or path.' });
    }
    if (!hasPermission(req.role, 'container.files.upload', relPath)) {
        return res.status(403).json({ code: 403, success: false, message: 'You do not have permission to upload files to this directory.' });
    }
    try {
        const fileBuffer = Buffer.from(file, 'base64');
        const result = uploadFile(req.role, relPath, fileBuffer, fileBuffer.length);
        res.json(result);
    } catch (err) {
        res.status(err.code || 500).json({ code: err.code || 500, success: false, message: err.message || 'Upload failed.' });
    }
});

app.post('/api/files/delete', authMiddleware, (req, res) => {
    const { path: relPath } = req.body || {};
    if (!relPath) {
        return res.status(400).json({ code: 400, success: false, message: 'Missing path.' });
    }
    if (!hasPermission(req.role, 'container.files.delete', relPath)) {
        return res.status(403).json({ code: 403, success: false, message: 'You do not have permission to delete files in this directory.' });
    }
    try {
        const result = deleteFile(req.role, relPath);
        res.json(result);
    } catch (err) {
        res.status(err.code || 500).json({ code: err.code || 500, success: false, message: err.message || 'Delete failed.' });
    }
});

app.get('/api/files/list', authMiddleware, (req, res) => {
    const relDir = req.query.dir || '';
    if (!hasPermission(req.role, 'container.files.view', relDir)) {
        return res.status(403).json({ code: 403, success: false, message: 'You do not have permission to view this directory.' });
    }
    try {
        const result = listFiles(req.role, relDir);
        res.json(result);
    } catch (err) {
        res.status(err.code || 500).json({ code: err.code || 500, success: false, message: err.message || 'List failed.' });
    }
});

app.get('/', (req, res) => {
    res.json({
        code: 200,
        success: true,
        message: 'Asteroid Container Management Server running.',
        container: config.name
    });
});

// --- Admin-only Config API ---
app.get('/api/about-instance', (req, res) => {
    const config = getConfigCache();
    const publicConfig = {
        id: config.id,
        name: config.name,
        description: config.description,
        port: config.port,
        roles: config.roles,
        permissions: config.permissions,
        maxContainerSize: config.maxContainerSize,
        maxIndividualFileSize: config.maxIndividualFileSize,
        defaultRole: config.defaultRole,
        allowedRequestDomains: config.allowedRequestDomains,
        deniedRequestDomains: config.deniedRequestDomains
    };
    res.json({ code: 200, success: true, instance: publicConfig });
});

app.get('/api/admin/config', authMiddleware, (req, res) => {
    if (!isAdminRole(req.role)) {
        return res.status(403).json({ code: 403, success: false, message: 'Admin permission required.' });
    }
    res.json({ code: 200, success: true, config: getConfigCache() });
});

app.post('/api/admin/config', authMiddleware, (req, res) => {
    if (!isAdminRole(req.role)) {
        return res.status(403).json({ code: 403, success: false, message: 'Admin permission required.' });
    }
    const newConfig = req.body;
    try {
        updateConfig(newConfig);
        res.json({ code: 200, success: true, message: 'Config updated and reloaded.' });
    } catch (err) {
        res.status(500).json({ code: 500, success: false, message: err.message || 'Failed to update config.' });
    }
});

app.post('/api/admin/config/reload', authMiddleware, (req, res) => {
    if (!isAdminRole(req.role)) {
        return res.status(403).json({ code: 403, success: false, message: 'Admin permission required.' });
    }
    reloadConfig();
    res.json({ code: 200, success: true, message: 'Config reloaded.' });
});

// --- Public File Serving ---
const publicRoot = path.join(__dirname, 'DO_NOT_DELETE', 'container');

function isPublicFile(relPath, config) {
    const publicFiles = config.publicFiles || [];
    const nonPublicFiles = config.nonPublicFiles || [];
    relPath = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
    for (const pattern of nonPublicFiles) {
        if (publicPatternMatch(relPath, pattern)) return false;
    }
    for (const pattern of publicFiles) {
        if (pattern === '*' || publicPatternMatch(relPath, pattern)) return true;
    }
    return false;
}

function publicPatternMatch(relPath, pattern) {
    relPath = relPath.replace(/\\/g, '/');
    pattern = pattern.replace(/\\/g, '/');
    if (pattern === '*') return true;
    if (pattern.endsWith('/*')) {
        return relPath.startsWith(pattern.slice(0, -1));
    }
    return relPath === pattern.replace(/^\/+/, '');
}

app.use('/', (req, res, next) => {
    const config = loadConfig();
    if (!config.publicFileAccess) return next();
    const relPath = decodeURIComponent(req.path.replace(/^\/+/, ''));
    const absPath = path.join(publicRoot, relPath);
    if (isPublicFile(relPath, config) && absPath.startsWith(publicRoot) && require('fs').existsSync(absPath)) {
        return res.sendFile(absPath);
    }
    next();
});

app.listen(PORT, () => {
    console.log(`Your asteroid container is running on port ${PORT}!`);
});
