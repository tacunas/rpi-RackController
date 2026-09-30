const express = require('express');
const cors = require('cors');
const path = require('path');
const { RackController } = require('./controller');

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';
const CONFIG_FILE = process.env.RACK_CONFIG || 'config.json';

const controller = new RackController(CONFIG_FILE);
controller.start();

app.use(cors());
app.use(express.json());

// Favicon routes with aggressive cache-busting headers
app.get(['/favicon.ico', '/favicon.png', '/favicon.svg', '/favicon-32.png', '/favicon-16.png', '/apple-touch-icon.png'], (req, res) => {
  const filename = path.basename(req.path);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(staticDir, filename));
});

// Serve static frontend files
const staticDir = path.join(__dirname, 'static');
app.use(express.static(staticDir));
app.use('/static', express.static(staticDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// REST API Endpoints
app.get('/api/status', (req, res) => {
  res.json(controller.getSystemStatus());
});

app.post('/api/metrics', (req, res) => {
  const metric = req.body;
  if (!metric || !metric.node_id) {
    return res.status(400).json({ error: 'node_id is required' });
  }

  if (!metric.ip_address) {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    metric.ip_address = clientIp ? clientIp.replace(/^.*:/, '') : null;
  }

  controller.recordMetric(metric);
  res.json({ status: 'ok', node_id: metric.node_id });
});

app.post('/api/fans', (req, res) => {
  controller.updateFanControl(req.body || {});
  res.json({
    status: 'ok',
    auto_mode: controller.autoMode,
    duties: controller.hardware.getAllChannelDuties(),
  });
});

app.post('/api/config/sensor-alias', (req, res) => {
  const { sensor_id, alias } = req.body || {};
  if (!sensor_id || !alias) {
    return res.status(400).json({ error: 'sensor_id and alias are required' });
  }
  controller.updateSensorAlias(sensor_id, alias);
  res.json({ status: 'ok', sensor_id, alias });
});

// Sensor Add / Update / Delete
app.post('/api/config/sensor', (req, res) => {
  const { sensor_id, alias } = req.body || {};
  if (!sensor_id) {
    return res.status(400).json({ error: 'sensor_id is required' });
  }
  try {
    const result = controller.saveSensor(sensor_id, alias);
    res.json({ status: 'ok', sensor: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/config/sensor/:id', (req, res) => {
  const deleted = controller.deleteSensor(req.params.id);
  res.json({ status: deleted ? 'ok' : 'not_found', sensor_id: req.params.id });
});

// Fan Add / Update / Delete
app.post('/api/config/fan', (req, res) => {
  const { channel, name, gpio, min_duty, default_duty, pin_type } = req.body || {};
  if (!channel) {
    return res.status(400).json({ error: 'channel is required' });
  }
  try {
    const result = controller.saveFanChannel(channel, { name, gpio, min_duty, default_duty, pin_type });
    res.json({ status: 'ok', fan: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/config/fan/:channel', (req, res) => {
  const deleted = controller.deleteFanChannel(req.params.channel);
  res.json({ status: deleted ? 'ok' : 'not_found', channel: req.params.channel });
});

// PDU Branch Add / Update / Delete
app.post('/api/config/pdu-channel', (req, res) => {
  const { id, name, rail, i2c_addr, base_a, nominal_v } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }
  try {
    const result = controller.savePduChannel(id, { name, rail, i2c_addr, base_a, nominal_v });
    res.json({ status: 'ok', channel: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/config/pdu-channel/:id', (req, res) => {
  const deleted = controller.deletePduChannel(req.params.id);
  res.json({ status: deleted ? 'ok' : 'not_found', id: req.params.id });
});

// Display Order Update (sensors, fans, pdu_channels, nodes)
app.post('/api/config/order', (req, res) => {
  const { type, order } = req.body || {};
  if (!type || !order) {
    return res.status(400).json({ error: 'type and order are required' });
  }
  try {
    const updated = controller.updateDisplayOrder(type, order);
    res.json({ status: 'ok', type, order: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/config', (req, res) => {
  res.json(controller.config);
});

app.post('/api/config/curve', (req, res) => {
  controller.updateFanCurve(req.body || {});
  res.json({ status: 'ok', curve: controller.fanCurve });
});

// Admin Authentication (User: jackson / Pass: Conti197619!)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'jackson' && password === 'Conti197619!') {
    const token = Buffer.from(`auth_${username}_${Date.now()}`).toString('base64');
    return res.json({ success: true, token, username: 'jackson' });
  }
  return res.status(401).json({ success: false, error: 'Invalid username or password' });
});

// Delete Cluster Node from List
app.delete('/api/config/node/:id', (req, res) => {
  const nodeId = req.params.id;
  if (!nodeId) return res.status(400).json({ error: 'node_id is required' });
  const deleted = controller.deleteNode(nodeId);
  res.json({ status: deleted ? 'ok' : 'not_found', node_id: nodeId });
});

// Custom Per-Fan Rules
app.post('/api/config/fan-rules', (req, res) => {
  const { rules } = req.body || {};
  if (!Array.isArray(rules)) {
    return res.status(400).json({ error: 'rules array is required' });
  }
  try {
    const saved = controller.saveFanRules(rules);
    res.json({ status: 'ok', rules: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/config/fan-rules', (req, res) => {
  res.json({ status: 'ok', rules: controller.fanRules });
});

// Occupancy Mode (Home / Away) & Max Speed Limits
app.post('/api/config/occupancy', (req, res) => {
  const result = controller.setOccupancyMode(req.body || {});
  res.json({ status: 'ok', ...result });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[RackController] Server listening on http://${HOST}:${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('\n[RackController] Shutting down...');
  controller.stop();
  server.close(() => {
    console.log('[RackController] HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { app, controller, server };
