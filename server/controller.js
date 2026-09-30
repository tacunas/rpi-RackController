const fs = require('fs');
const path = require('path');
const { HardwareManager } = require('./hardware');

function sortByIdOrder(items, orderArray, getId = item => item.id) {
  if (!Array.isArray(orderArray) || orderArray.length === 0) return items;
  const orderMap = new Map();
  orderArray.forEach((id, idx) => orderMap.set(String(id), idx));
  return [...items].sort((a, b) => {
    const idA = String(getId(a));
    const idB = String(getId(b));
    const idxA = orderMap.has(idA) ? orderMap.get(idA) : 9999;
    const idxB = orderMap.has(idB) ? orderMap.get(idB) : 9999;
    if (idxA !== idxB) return idxA - idxB;
    return idA.localeCompare(idB);
  });
}

class RackController {
  constructor(configPath = 'config.json') {
    this.configPath = path.resolve(configPath);
    this.config = this.loadConfig();

    const hwConf = this.config.hardware || {};
    this.hardware = new HardwareManager({
      frequencyHz: hwConf.pwm_frequency_hz || 100,
      channelConfigs: hwConf.channels,
    });

    this.nodes = new Map();
    this.latestSensors = [];
    this.nodeTimeoutSeconds = (this.config.server && this.config.server.node_timeout_seconds) || 10;

    const fanConf = this.config.fan_control || {};
    this.autoMode = fanConf.auto_mode !== undefined ? fanConf.auto_mode : true;
    this.occupancyMode = fanConf.occupancy_mode || 'home';
    this.homeMaxDuty = Math.max(0, Math.min(100, parseInt(fanConf.home_max_duty ?? 50, 10)));
    this.awayMaxDuty = Math.max(0, Math.min(100, parseInt(fanConf.away_max_duty ?? 100, 10)));
    this.fanCurve = {
      rack_temp_min: fanConf.rack_temp_min ?? 30.0,
      rack_temp_max: fanConf.rack_temp_max ?? 50.0,
      node_temp_min: fanConf.node_temp_min ?? 45.0,
      node_temp_max: fanConf.node_temp_max ?? 80.0,
      min_fan_duty: fanConf.min_fan_duty ?? 35,
      max_fan_duty: fanConf.max_fan_duty ?? 100,
    };
    this.manualDuties = fanConf.manual_duties || { '1': 50, '2': 50, '3': 50, '4': 50 };
    this.fanRules = Array.isArray(fanConf.rules) ? fanConf.rules : [];
    this.targetFanDuty = 50;

    this.sensorAliases = this.config.sensor_aliases || {};
    this.displayOrder = this.config.display_order || {};
    if (!Array.isArray(this.displayOrder.sensors)) {
      this.displayOrder.sensors = Object.keys(this.sensorAliases);
    } else {
      // Ensure any newly added aliases are present
      for (const id of Object.keys(this.sensorAliases)) {
        if (!this.displayOrder.sensors.includes(id)) {
          this.displayOrder.sensors.push(id);
        }
      }
    }

    if (!Array.isArray(this.displayOrder.fans)) {
      this.displayOrder.fans = Object.keys(hwConf.channels || {}).map(c => parseInt(c, 10));
    } else {
      this.displayOrder.fans = this.displayOrder.fans.map(c => parseInt(c, 10));
      for (const chStr of Object.keys(hwConf.channels || {})) {
        const ch = parseInt(chStr, 10);
        if (!this.displayOrder.fans.includes(ch)) {
          this.displayOrder.fans.push(ch);
        }
      }
    }

    if (!Array.isArray(this.displayOrder.pdu_channels)) {
      this.displayOrder.pdu_channels = Object.keys((this.config.pdu && this.config.pdu.channels) || {});
    } else {
      for (const pduId of Object.keys((this.config.pdu && this.config.pdu.channels) || {})) {
        if (!this.displayOrder.pdu_channels.includes(pduId)) {
          this.displayOrder.pdu_channels.push(pduId);
        }
      }
    }

    if (!Array.isArray(this.displayOrder.nodes)) {
      this.displayOrder.nodes = [];
    } else {
      // Pre-populate known cluster nodes so that the dashboard immediately displays all configured nodes on startup
      for (const nodeId of this.displayOrder.nodes) {
        if (!this.nodes.has(nodeId)) {
          const lower = String(nodeId).toLowerCase();
          this.nodes.set(nodeId, {
            node_id: nodeId,
            os: lower.includes('dx') ? 'Windows' : (lower.includes('prox') ? 'Proxmox VE' : (lower.includes('opi') ? 'Orange Pi OS' : 'Linux')),
            cpu_temp: 0,
            cpu_usage: 0,
            mem_usage: 0,
            disk_usage: 0,
            load_avg: [0, 0, 0],
            uptime: 0,
            ip_address: null,
            hostname: nodeId,
            pmic: null,
            online: false,
            last_seen: 0,
          });
        }
      }
    }

    this.latestPdu = null;
    this.intervalId = null;
  }

  loadConfig() {
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('[Controller] Error reading config.json:', err.message);
      }
    }
    return {};
  }

  saveConfig() {
    this.config.fan_control = {
      auto_mode: this.autoMode,
      occupancy_mode: this.occupancyMode,
      home_max_duty: this.homeMaxDuty,
      away_max_duty: this.awayMaxDuty,
      rack_temp_min: this.fanCurve.rack_temp_min,
      rack_temp_max: this.fanCurve.rack_temp_max,
      node_temp_min: this.fanCurve.node_temp_min,
      node_temp_max: this.fanCurve.node_temp_max,
      min_fan_duty: this.fanCurve.min_fan_duty,
      max_fan_duty: this.fanCurve.max_fan_duty,
      manual_duties: this.manualDuties,
      rules: this.fanRules,
    };
    this.config.sensor_aliases = this.sensorAliases;
    this.config.display_order = this.displayOrder;

    try {
      const tempPath = `${this.configPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.config, null, 2), 'utf8');
      fs.renameSync(tempPath, this.configPath);
      console.log('[Controller] config.json successfully updated.');
    } catch (err) {
      console.error('[Controller] Error saving config.json:', err.message);
    }
  }

  recordMetric(metric) {
    const now = Date.now() / 1000;
    this.nodes.set(metric.node_id, {
      node_id: metric.node_id,
      os: metric.os,
      cpu_temp: metric.cpu_temp || 0,
      cpu_usage: metric.cpu_usage || 0,
      mem_usage: metric.mem_usage || 0,
      disk_usage: metric.disk_usage || 0,
      load_avg: metric.load_avg || [],
      uptime: metric.uptime || 0,
      ip_address: metric.ip_address || null,
      hostname: metric.hostname || null,
      pmic: metric.pmic || null,
      online: true,
      last_seen: now,
    });

    if (metric.node_id && !this.displayOrder.nodes.includes(metric.node_id)) {
      this.displayOrder.nodes.push(metric.node_id);
      this.saveConfig();
    }
  }

  updateNodeLiveness(now) {
    for (const [id, node] of this.nodes.entries()) {
      if (now - node.last_seen > this.nodeTimeoutSeconds) {
        node.online = false;
      }
    }
  }

  calculateAutoFanDuty(maxRackTemp, maxNodeTemp) {
    const curve = this.fanCurve;
    let rackDuty = curve.min_fan_duty;

    if (maxRackTemp !== null && maxRackTemp !== undefined) {
      if (maxRackTemp <= curve.rack_temp_min) {
        rackDuty = curve.min_fan_duty;
      } else if (maxRackTemp >= curve.rack_temp_max) {
        rackDuty = curve.max_fan_duty;
      } else {
        const ratio = (maxRackTemp - curve.rack_temp_min) / (curve.rack_temp_max - curve.rack_temp_min);
        rackDuty = curve.min_fan_duty + ratio * (curve.max_fan_duty - curve.min_fan_duty);
      }
    }

    let nodeDuty = curve.min_fan_duty;
    if (maxNodeTemp !== null && maxNodeTemp !== undefined) {
      if (maxNodeTemp <= curve.node_temp_min) {
        nodeDuty = curve.min_fan_duty;
      } else if (maxNodeTemp >= curve.node_temp_max) {
        nodeDuty = curve.max_fan_duty;
      } else {
        const ratio = (maxNodeTemp - curve.node_temp_min) / (curve.node_temp_max - curve.node_temp_min);
        nodeDuty = curve.min_fan_duty + ratio * (curve.max_fan_duty - curve.min_fan_duty);
      }
    }

    let target = Math.round(Math.max(rackDuty, nodeDuty, curve.min_fan_duty));
    target = Math.max(curve.min_fan_duty, Math.min(curve.max_fan_duty, target));
    return target;
  }

  updateFanControl({ auto_mode, manual_duties }) {
    if (auto_mode !== undefined && auto_mode !== null) {
      this.autoMode = Boolean(auto_mode);
    }

    const chConfigs = (this.config.hardware && this.config.hardware.channels) || {};
    if (manual_duties) {
      for (const [chStr, duty] of Object.entries(manual_duties)) {
        const ch = parseInt(chStr, 10);
        if (chConfigs[String(ch)]) {
          this.manualDuties[String(ch)] = Math.max(0, Math.min(100, parseInt(duty, 10)));
        }
      }
    }

    if (!this.autoMode) {
      for (const chStr of Object.keys(chConfigs)) {
        const ch = parseInt(chStr, 10);
        const duty = this.manualDuties[chStr] ?? (chConfigs[chStr].default_duty || 50);
        this.hardware.setChannelDuty(ch, duty);
      }
    }

    this.saveConfig();
  }

  saveSensor(sensorId, alias) {
    if (!sensorId) throw new Error('센서 ID가 필요합니다.');
    const id = sensorId.trim();
    const name = (alias && alias.trim()) ? alias.trim() : id;
    this.sensorAliases[id] = name;
    if (!this.displayOrder.sensors.includes(id)) {
      this.displayOrder.sensors.push(id);
    }
    this.saveConfig();
    this.hardware.readTemperatures(this.sensorAliases).then(s => { this.latestSensors = s; });
    return { id, alias: name };
  }

  deleteSensor(sensorId) {
    if (!sensorId) return false;
    const id = sensorId.trim();
    if (this.sensorAliases[id]) {
      delete this.sensorAliases[id];
      this.displayOrder.sensors = this.displayOrder.sensors.filter(sId => sId !== id);
      this.saveConfig();
      this.hardware.readTemperatures(this.sensorAliases).then(s => { this.latestSensors = s; });
      return true;
    }
    return false;
  }

  updateSensorAlias(sensorId, alias) {
    return this.saveSensor(sensorId, alias);
  }

  saveFanChannel(channel, channelConfig) {
    const ch = parseInt(channel, 10);
    if (!ch || ch < 1) throw new Error('유효한 채널 번호가 필요합니다.');

    if (!this.config.hardware) this.config.hardware = {};
    if (!this.config.hardware.channels) this.config.hardware.channels = {};

    const minDuty = Math.max(0, Math.min(100, parseInt(channelConfig.min_duty || 35, 10)));
    const defaultDuty = Math.max(0, Math.min(100, parseInt(channelConfig.default_duty || 50, 10)));
    const gpio = parseInt(channelConfig.gpio || 0, 10);
    const pin_type = (channelConfig.pin_type && channelConfig.pin_type.trim()) ? channelConfig.pin_type.trim() : '3-Pin';
    const name = (channelConfig.name && channelConfig.name.trim()) ? channelConfig.name.trim() : `팬 채널 ${ch}`;

    const newCfg = {
      name,
      gpio,
      pin_type,
      default_duty: defaultDuty,
      min_duty: minDuty,
    };

    this.config.hardware.channels[String(ch)] = newCfg;

    if (this.manualDuties[String(ch)] === undefined) {
      this.manualDuties[String(ch)] = defaultDuty;
    }

    if (!this.displayOrder.fans.includes(ch)) {
      this.displayOrder.fans.push(ch);
    }

    this.hardware.updateChannelConfig(ch, newCfg);
    this.saveConfig();
    return { channel: ch, ...newCfg };
  }

  deleteFanChannel(channel) {
    const ch = parseInt(channel, 10);
    const chStr = String(ch);
    if (this.config.hardware && this.config.hardware.channels && this.config.hardware.channels[chStr]) {
      delete this.config.hardware.channels[chStr];
      delete this.manualDuties[chStr];
      this.displayOrder.fans = this.displayOrder.fans.filter(c => c !== ch);
      this.hardware.removeChannel(ch);
      this.saveConfig();
      return true;
    }
    return false;
  }

  savePduChannel(channelId, channelConfig) {
    if (!channelId) throw new Error('분기 ID가 필요합니다.');
    const id = channelId.trim();

    if (!this.config.pdu) this.config.pdu = {};
    if (!this.config.pdu.channels) this.config.pdu.channels = {};

    const rail = channelConfig.rail === '12V' ? '12V' : '5V';
    const name = (channelConfig.name && channelConfig.name.trim()) ? channelConfig.name.trim() : id;
    const i2cAddr = (channelConfig.i2c_addr && channelConfig.i2c_addr.trim()) ? channelConfig.i2c_addr.trim() : '0x40';
    const baseA = parseFloat(channelConfig.base_a || 1.0);
    const nominalV = parseFloat(channelConfig.nominal_v || (rail === '12V' ? 12.15 : 5.10));

    const newCfg = {
      name,
      rail,
      nominal_v: nominalV,
      base_a: baseA,
      i2c_addr: i2cAddr,
    };

    this.config.pdu.channels[id] = newCfg;
    if (!this.displayOrder.pdu_channels.includes(id)) {
      this.displayOrder.pdu_channels.push(id);
    }
    this.saveConfig();
    return { id, ...newCfg };
  }

  deletePduChannel(channelId) {
    if (!channelId) return false;
    const id = channelId.trim();
    if (this.config.pdu && this.config.pdu.channels && this.config.pdu.channels[id]) {
      delete this.config.pdu.channels[id];
      this.displayOrder.pdu_channels = this.displayOrder.pdu_channels.filter(cId => cId !== id);
      this.saveConfig();
      return true;
    }
    return false;
  }

  updateDisplayOrder(type, order) {
    const validTypes = ['sensors', 'fans', 'pdu_channels', 'nodes'];
    if (!validTypes.includes(type)) {
      throw new Error(`유효하지 않은 순서 타입입니다: ${type}`);
    }
    if (!Array.isArray(order)) {
      throw new Error('order는 배열이어야 합니다.');
    }
    this.displayOrder[type] = order.map(item => (type === 'fans' ? parseInt(item, 10) : String(item)));
    this.saveConfig();
    return this.displayOrder[type];
  }

  updateFanCurve(curve) {
    if (curve) {
      this.fanCurve = {
        rack_temp_min: parseFloat(curve.rack_temp_min ?? this.fanCurve.rack_temp_min),
        rack_temp_max: parseFloat(curve.rack_temp_max ?? this.fanCurve.rack_temp_max),
        node_temp_min: parseFloat(curve.node_temp_min ?? this.fanCurve.node_temp_min),
        node_temp_max: parseFloat(curve.node_temp_max ?? this.fanCurve.node_temp_max),
        min_fan_duty: parseInt(curve.min_fan_duty ?? this.fanCurve.min_fan_duty, 10),
        max_fan_duty: parseInt(curve.max_fan_duty ?? this.fanCurve.max_fan_duty, 10),
      };
      this.saveConfig();
    }
  }

  saveFanRules(rules) {
    if (!Array.isArray(rules)) {
      throw new Error('Rules must be an array');
    }
    this.fanRules = rules.map((r, idx) => ({
      id: r.id || `rule_${Date.now()}_${idx}`,
      sensor_id: String(r.sensor_id || 'max_rack'),
      condition: r.condition || 'gte',
      threshold_temp: parseFloat(r.threshold_temp ?? 40.0),
      fan_channel: parseInt(r.fan_channel || 1, 10),
      duty: Math.max(0, Math.min(100, parseInt(r.duty ?? 50, 10))),
      enabled: r.enabled !== false,
    }));
    this.saveConfig();
    return this.fanRules;
  }

  setOccupancyMode({ mode, home_max_duty, away_max_duty }) {
    if (mode === 'home' || mode === 'away') {
      this.occupancyMode = mode;
    }
    if (home_max_duty !== undefined && !isNaN(parseInt(home_max_duty, 10))) {
      this.homeMaxDuty = Math.max(0, Math.min(100, parseInt(home_max_duty, 10)));
    }
    if (away_max_duty !== undefined && !isNaN(parseInt(away_max_duty, 10))) {
      this.awayMaxDuty = Math.max(0, Math.min(100, parseInt(away_max_duty, 10)));
    }
    this.saveConfig();
    return {
      occupancy_mode: this.occupancyMode,
      home_max_duty: this.homeMaxDuty,
      away_max_duty: this.awayMaxDuty,
    };
  }

  deleteNode(nodeId) {
    if (!nodeId) return false;
    const id = String(nodeId).trim();
    const existed = this.nodes.has(id);
    this.nodes.delete(id);
    this.displayOrder.nodes = this.displayOrder.nodes.filter(nId => nId !== id);
    this.saveConfig();
    return existed;
  }

  async step() {
    const now = Date.now() / 1000;
    this.updateNodeLiveness(now);

    this.latestSensors = await this.hardware.readTemperatures(this.sensorAliases);

    const maxRack = this.latestSensors.length > 0
      ? Math.max(...this.latestSensors.map(s => s.temp))
      : null;

    const onlineNodes = Array.from(this.nodes.values()).filter(n => n.online);
    const maxNode = onlineNodes.length > 0
      ? Math.max(...onlineNodes.map(n => n.cpu_temp))
      : null;

    const chConfigs = (this.config.hardware && this.config.hardware.channels) || {};
    const chKeys = Object.keys(chConfigs);

    if (this.autoMode) {
      this.targetFanDuty = this.calculateAutoFanDuty(maxRack, maxNode);

      const sensorMap = new Map();
      for (const s of this.latestSensors) {
        if (s.id && typeof s.temp === 'number' && !isNaN(s.temp)) {
          sensorMap.set(s.id, s.temp);
        }
      }

      for (const chStr of chKeys) {
        const ch = parseInt(chStr, 10);
        let fanDuty = this.targetFanDuty;

        // Evaluate per-fan custom rules
        const matchingRules = this.fanRules.filter(r => {
          if (!r || r.enabled === false) return false;
          if (parseInt(r.fan_channel, 10) !== ch) return false;

          let currentTemp = null;
          if (r.sensor_id === 'max_rack') {
            currentTemp = maxRack;
          } else if (r.sensor_id === 'max_node') {
            currentTemp = maxNode;
          } else if (sensorMap.has(r.sensor_id)) {
            currentTemp = sensorMap.get(r.sensor_id);
          }

          if (currentTemp === null || currentTemp === undefined || isNaN(currentTemp)) {
            return false;
          }

          const thresh = parseFloat(r.threshold_temp);
          if (isNaN(thresh)) return false;

          switch (r.condition) {
            case 'gte': return currentTemp >= thresh;
            case 'lte': return currentTemp <= thresh;
            case 'gt': return currentTemp > thresh;
            case 'lt': return currentTemp < thresh;
            case 'eq': return Math.abs(currentTemp - thresh) < 0.1;
            default: return currentTemp >= thresh;
          }
        });

        if (matchingRules.length > 0) {
          const maxReqDuty = Math.max(...matchingRules.map(r => parseInt(r.duty, 10)));
          fanDuty = Math.max(0, Math.min(100, maxReqDuty));
        }

        // Apply Occupancy Mode Max Speed Limit (Home = quiet cap, Away = full performance cap)
        const activeLimit = this.occupancyMode === 'away' ? this.awayMaxDuty : this.homeMaxDuty;
        fanDuty = Math.min(fanDuty, activeLimit);

        this.hardware.setChannelDuty(ch, fanDuty);
      }
    } else {
      for (const chStr of chKeys) {
        const ch = parseInt(chStr, 10);
        const duty = this.manualDuties[chStr] ?? (chConfigs[chStr].default_duty || 50);
        this.hardware.setChannelDuty(ch, duty);
      }
    }

    // Read PDU power metrics
    this.latestPdu = this.hardware.readPduPower(this.config.pdu || {});
  }

  start() {
    if (!this.intervalId) {
      this.step();
      this.intervalId = setInterval(() => {
        this.step().catch(err => console.error('[Controller] Loop error:', err.message));
      }, 2000);
      console.log('[Controller] 2-second background control loop started.');
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.hardware.cleanup();
    console.log('[Controller] Stopped.');
  }

  getSystemStatus() {
    const now = Date.now() / 1000;
    this.updateNodeLiveness(now);

    const chConfigs = (this.config.hardware && this.config.hardware.channels) || {};
    const duties = this.hardware.getAllChannelDuties();
    const fans = [];

    const sortedChs = Object.keys(chConfigs).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    for (const chStr of sortedChs) {
      const ch = parseInt(chStr, 10);
      const chInfo = chConfigs[chStr] || {};
      fans.push({
        channel: ch,
        name: chInfo.name || `채널 ${ch}`,
        gpio: chInfo.gpio || 0,
        pin_type: chInfo.pin_type || '3-Pin',
        min_duty: chInfo.min_duty || 35,
        default_duty: chInfo.default_duty || 50,
        duty_cycle: duties[ch] !== undefined ? duties[ch] : (chInfo.default_duty || 50),
      });
    }

    const sortedFans = sortByIdOrder(fans, this.displayOrder.fans, f => f.channel);

    const onlineNodes = Array.from(this.nodes.values()).filter(n => n.online);
    const validRackTemps = this.latestSensors
      .map(s => s.temp)
      .filter(t => typeof t === 'number' && !isNaN(t));
    const maxRack = validRackTemps.length > 0
      ? Math.max(...validRackTemps)
      : null;

    const validNodeTemps = onlineNodes
      .map(n => n.cpu_temp)
      .filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
    const maxNode = validNodeTemps.length > 0
      ? Math.max(...validNodeTemps)
      : null;

    const nodesObj = {};
    for (const [k, v] of this.nodes.entries()) {
      nodesObj[k] = v;
    }

    // Always calculate fresh PDU metrics reflecting current config.pdu
    const pduData = this.hardware.readPduPower(this.config.pdu || {});
    if (pduData && Array.isArray(pduData.channels)) {
      pduData.channels = sortByIdOrder(pduData.channels, this.displayOrder.pdu_channels, c => c.id);
    }
    this.latestPdu = pduData;

    // Filter and merge configured sensor aliases
    const reportedIds = new Set(this.latestSensors.map(s => s.id));
    let displaySensors = this.latestSensors.filter(s => {
      // In mock mode, only show sensors that are in sensorAliases
      return !this.hardware.mockSensorsActive || this.sensorAliases[s.id] !== undefined;
    });

    for (const [id, alias] of Object.entries(this.sensorAliases)) {
      if (!reportedIds.has(id)) {
        displaySensors.push({ id, alias, temp: this.hardware.mockMode ? 35.0 : null });
      }
    }

    displaySensors = sortByIdOrder(displaySensors, this.displayOrder.sensors, s => s.id);
    const sortedNodesList = sortByIdOrder(Array.from(this.nodes.values()), this.displayOrder.nodes, n => n.node_id);

    return {
      nodes: nodesObj,
      node_list: sortedNodesList,
      sensors: displaySensors,
      fans: sortedFans,
      pdu: pduData,
      display_order: this.displayOrder,
      auto_mode: this.autoMode,
      occupancy_mode: this.occupancyMode,
      home_max_duty: this.homeMaxDuty,
      away_max_duty: this.awayMaxDuty,
      fan_curve: this.fanCurve,
      fan_rules: this.fanRules,
      mock_mode: Boolean(this.hardware.mockMode),
      max_rack_temp: maxRack,
      max_node_temp: maxNode,
      target_fan_duty: this.targetFanDuty,
      online_nodes_count: onlineNodes.length,
      total_nodes_count: this.nodes.size,
      timestamp: now,
    };
  }
}

module.exports = { RackController };
