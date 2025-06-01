// --- File Manager ---
// Handles upload, delete, list, etc.
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./configLoader');
const { getTotalUsedSpace, isValidPath, normalizePath } = require('./validator');
const { toBytes } = require('./utils');

const STORAGE_ROOT = path.join(__dirname, '..', 'DO_NOT_DELETE', 'container');

function uploadFile(role, relPath, fileBuffer, fileSize) {
    const config = loadConfig();
    const maxContainerSize = toBytes(config.maxContainerSize);
    const maxFileSize = toBytes(config.maxIndividualFileSize);
    const rolePerms = config.permissions[role] || {};
    const maxRoleTotal = toBytes(rolePerms['container.files.maxTotalUploadSize'] || config.maxContainerSize);
    const maxRoleIndividual = toBytes(rolePerms['container.files.maxIndividualUploadSize'] || config.maxIndividualFileSize);

    const absPath = path.join(STORAGE_ROOT, normalizePath(relPath));
    if (!isValidPath(absPath, STORAGE_ROOT)) {
        throw { code: 400, message: 'Invalid or prohibited path.' };
    }
    if (fileSize > maxFileSize || fileSize > maxRoleIndividual) {
        throw { code: 413, message: 'File exceeds allowed size.' };
    }
    const used = getTotalUsedSpace(STORAGE_ROOT);
    if (used + fileSize > maxContainerSize || used + fileSize > maxRoleTotal) {
        throw { code: 413, message: 'Container or role quota exceeded.' };
    }
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, fileBuffer);
    return { code: 200, success: true, message: 'File uploaded.' };
}

function deleteFile(role, relPath) {
    const absPath = path.join(STORAGE_ROOT, normalizePath(relPath));
    if (!isValidPath(absPath, STORAGE_ROOT)) {
        throw { code: 400, message: 'Invalid or prohibited path.' };
    }
    if (!fs.existsSync(absPath)) {
        throw { code: 404, message: 'File not found.' };
    }
    fs.unlinkSync(absPath);
    return { code: 200, success: true, message: 'File deleted.' };
}

function listFiles(role, relDir = '') {
    const absDir = path.join(STORAGE_ROOT, normalizePath(relDir));
    if (!isValidPath(absDir, STORAGE_ROOT)) {
        throw { code: 400, message: 'Invalid or prohibited path.' };
    }
    if (!fs.existsSync(absDir)) {
        throw { code: 404, message: 'Directory not found.' };
    }
    function walk(dir) {
        return fs.readdirSync(dir).map(name => {
            const full = path.join(dir, name);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
                return { name, type: 'directory', children: walk(full) };
            } else {
                return { name, type: 'file', size: stat.size };
            }
        });
    }
    return { code: 200, success: true, files: walk(absDir) };
}

module.exports = {
    uploadFile,
    deleteFile,
    listFiles,
};
