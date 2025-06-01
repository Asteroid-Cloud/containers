const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 4000;
const PANEL_CONFIG = path.join(__dirname, 'panel-config.json');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(session({
  secret: 'asteroid-panel-secret',
  resave: false,
  saveUninitialized: false
}));

// --- Panel Config Management ---
function loadPanelConfig() {
  if (!fs.existsSync(PANEL_CONFIG)) {
    return { adminKey: null, containers: [] };
  }
  return JSON.parse(fs.readFileSync(PANEL_CONFIG, 'utf-8'));
}
function savePanelConfig(cfg) {
  fs.writeFileSync(PANEL_CONFIG, JSON.stringify(cfg, null, 2), 'utf-8');
}

// --- Middleware: Require Panel Admin Login ---
function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.redirect('/login');
  next();
}

// --- First Time Setup ---
app.get('/login', (req, res) => {
  const cfg = loadPanelConfig();
  if (!cfg.adminKey) return res.render('setup');
  res.render('login');
});
app.post('/login', (req, res) => {
  const { adminKey } = req.body;
  const cfg = loadPanelConfig();
  if (!cfg.adminKey) {
    cfg.adminKey = adminKey;
    savePanelConfig(cfg);
    req.session.admin = true;
    return res.redirect('/');
  }
  if (adminKey === cfg.adminKey) {
    req.session.admin = true;
    return res.redirect('/');
  }
  res.render('login', { error: 'Invalid admin key.' });
});
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// --- Dashboard ---
app.get('/', requireAdmin, (req, res) => {
  const cfg = loadPanelConfig();
  res.render('dashboard', { containers: cfg.containers });
});

// --- Add/Edit/Remove Containers ---
app.get('/containers/add', requireAdmin, (req, res) => {
  res.render('add-container');
});
app.post('/containers/add', requireAdmin, (req, res) => {
  const { name, url, adminKey } = req.body;
  const cfg = loadPanelConfig();
  cfg.containers.push({ name, url, adminKey });
  savePanelConfig(cfg);
  res.redirect('/');
});
app.post('/containers/delete', requireAdmin, (req, res) => {
  const { idx } = req.body;
  const cfg = loadPanelConfig();
  cfg.containers.splice(idx, 1);
  savePanelConfig(cfg);
  res.redirect('/');
});

// --- Container Management UI (Proxy API) ---
app.get('/containers/:idx', requireAdmin, async (req, res) => {
  const cfg = loadPanelConfig();
  const container = cfg.containers[req.params.idx];
  if (!container) return res.redirect('/');
  let about = null, error = null;
  try {
    const resp = await axios.get(container.url + '/api/about-instance');
    about = resp.data.instance;
  } catch (e) {
    error = 'Could not fetch instance info.';
  }
  res.render('container', { container, idx: req.params.idx, about, error });
});

// --- Proxy Admin API Calls ---
app.post('/containers/:idx/config', requireAdmin, async (req, res) => {
  const cfg = loadPanelConfig();
  const container = cfg.containers[req.params.idx];
  try {
    await axios.post(container.url + '/api/admin/config', req.body, {
      headers: { 'Authorization': 'Bearer ' + await getAdminToken(container) }
    });
    res.redirect('/containers/' + req.params.idx);
  } catch (e) {
    res.send('Failed to update config: ' + (e.response?.data?.message || e.message));
  }
});
app.post('/containers/:idx/reload', requireAdmin, async (req, res) => {
  const cfg = loadPanelConfig();
  const container = cfg.containers[req.params.idx];
  try {
    await axios.post(container.url + '/api/admin/config/reload', {}, {
      headers: { 'Authorization': 'Bearer ' + await getAdminToken(container) }
    });
    res.redirect('/containers/' + req.params.idx);
  } catch (e) {
    res.send('Failed to reload config: ' + (e.response?.data?.message || e.message));
  }
});

// --- File API Proxy Endpoints for File Manager ---
app.get('/containers/:idx/files/list', requireAdmin, async (req, res) => {
  const cfg = loadPanelConfig();
  const container = cfg.containers[req.params.idx];
  try {
    const token = await getAdminToken(container);
    const resp = await axios.get(container.url + '/api/files/list', {
      headers: { Authorization: 'Bearer ' + token },
      params: { dir: req.query.dir || '' }
    });
    res.json(resp.data);
  } catch (e) {
    res.json({ success: false, message: e.response?.data?.message || e.message });
  }
});

app.post('/containers/:idx/files/upload', requireAdmin, async (req, res) => {
  const cfg = loadPanelConfig();
  const container = cfg.containers[req.params.idx];
  try {
    const token = await getAdminToken(container);
    const resp = await axios.post(container.url + '/api/files/upload', req.body, {
      headers: { Authorization: 'Bearer ' + token }
    });
    res.json(resp.data);
  } catch (e) {
    res.json({ success: false, message: e.response?.data?.message || e.message });
  }
});

app.post('/containers/:idx/files/delete', requireAdmin, async (req, res) => {
  const cfg = loadPanelConfig();
  const container = cfg.containers[req.params.idx];
  try {
    const token = await getAdminToken(container);
    const resp = await axios.post(container.url + '/api/files/delete', req.body, {
      headers: { Authorization: 'Bearer ' + token }
    });
    res.json(resp.data);
  } catch (e) {
    res.json({ success: false, message: e.response?.data?.message || e.message });
  }
});

app.post('/containers/:idx/files/rename', requireAdmin, async (req, res) => {
  const cfg = loadPanelConfig();
  const container = cfg.containers[req.params.idx];
  const { oldPath, newPath } = req.body;
  try {
    const token = await getAdminToken(container);
    const fileUrl = container.url + '/' + encodeURIComponent(oldPath);
    const fileResp = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(fileResp.data, 'binary');
    const base64 = fileBuffer.toString('base64');
    await axios.post(container.url + '/api/files/upload', { file: base64, path: newPath }, {
      headers: { Authorization: 'Bearer ' + token }
    });
    await axios.post(container.url + '/api/files/delete', { path: oldPath }, {
      headers: { Authorization: 'Bearer ' + token }
    });
    res.json({ success: true, message: 'File renamed.' });
  } catch (e) {
    res.json({ success: false, message: e.response?.data?.message || e.message });
  }
});

// --- Helper: Get Admin Token ---
async function getAdminToken(container) {
  const resp = await axios.post(container.url + '/api/auth/request-token', {
    role: 'admin',
    adminKey: container.adminKey
  });
  return resp.data.token;
}

// --- Start Server ---
app.listen(PORT, () => {
  console.log('Asteroid Panel running on http://localhost:' + PORT);
});
