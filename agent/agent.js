#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

class MonitoringAgent {
  constructor(configFile = 'agent_config.json') {
    this.configFile = path.resolve(__dirname, configFile);
    this.config = this.loadConfig();

    this.serverUrl = (this.config.server_url || 'http://127.0.0.1:8000').replace(/\/+$/, '');
    this.nodeId = this.config.node_id || os.hostname();
    this.interval = (this.config.interval_seconds || 3) * 1000;
    this.timeout = (this.config.timeout_seconds || 5) * 1000;

    this.osName = this.detectOS();
    this.hostname = os.hostname();
    this.ipAddress = this.getLocalIP();

    this.lastCpus = os.cpus();
    this.lastRaplEnergy = null;
    this.lastRaplTime = null;
  }

  loadConfig() {
    if (fs.existsSync(this.configFile)) {
      try {
        const raw = fs.readFileSync(this.configFile, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        console.warn('[Agent] Failed to parse config file:', err.message);
      }
    }

    const defaultConfig = {
      server_url: 'http://127.0.0.1:8000',
      node_id: os.hostname(),
      interval_seconds: 3,
      timeout_seconds: 5,
    };

    try {
      fs.writeFileSync(this.configFile, JSON.stringify(defaultConfig, null, 2), 'utf8');
    } catch (_) {}

    return defaultConfig;
  }

  detectOS() {
    const platform = os.platform();
    if (platform === 'win32') {
      return `Windows ${os.release()}`;
    } else if (platform === 'darwin') {
      return `macOS ${os.release()}`;
    } else if (platform === 'linux') {
      if (fs.existsSync('/etc/os-release')) {
        try {
          const content = fs.readFileSync('/etc/os-release', 'utf8');
          const lines = content.split('\n');
          const data = {};
          for (const line of lines) {
            const idx = line.indexOf('=');
            if (idx > 0) {
              const k = line.slice(0, idx).trim();
              const v = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
              data[k] = v;
            }
          }
          const name = data.PRETTY_NAME || data.NAME;
          if (name && name.includes('Proxmox')) return `Proxmox VE (${data.VERSION_ID || ''})`.trim();
          if (name && name.includes('Armbian')) return `Armbian (${data.VERSION_CODENAME || ''})`.trim();
          if (name && (name.includes('Raspbian') || name.includes('Raspberry'))) return `Raspberry Pi OS (${data.VERSION_CODENAME || ''})`.trim();
          if (name) return name;
        } catch (_) {}
      }
      return 'Linux';
    }
    return platform;
  }

  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  getCpuTemp() {
    if (os.platform() === 'linux') {
      const candidates = [];
      try {
        if (fs.existsSync('/sys/class/thermal')) {
          const zones = fs.readdirSync('/sys/class/thermal').filter(f => f.startsWith('thermal_zone'));
          zones.forEach(z => candidates.push(`/sys/class/thermal/${z}/temp`));
        }
        if (fs.existsSync('/sys/class/hwmon')) {
          const hwmons = fs.readdirSync('/sys/class/hwmon').filter(f => f.startsWith('hwmon'));
          hwmons.forEach(h => {
            const hPath = `/sys/class/hwmon/${h}`;
            try {
              const files = fs.readdirSync(hPath).filter(f => f.startsWith('temp') && f.endsWith('_input'));
              files.forEach(f => candidates.push(`${hPath}/${f}`));
            } catch (_) {}
          });
        }
      } catch (_) {}

      let maxValidTemp = 0.0;
      for (const p of candidates) {
        try {
          if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, 'utf8').trim();
            let val = parseFloat(raw);
            if (val > 1000) val = val / 1000.0;
            if (val > 20 && val < 125) {
              if (val > maxValidTemp) maxValidTemp = val;
            }
          }
        } catch (_) {}
      }
      if (maxValidTemp > 0) return +(maxValidTemp.toFixed(1));
    } else if (os.platform() === 'win32') {
      try {
        const out = execSync('powershell -NoProfile -NonInteractive -Command "(Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue).CurrentTemperature"', { timeout: 3000 }).toString().trim();
        const firstLine = out.split('\n')[0].trim();
        const kelvin10 = parseInt(firstLine, 10);
        if (!isNaN(kelvin10) && kelvin10 > 2500 && kelvin10 < 4000) {
          const celsius = (kelvin10 / 10.0) - 273.15;
          if (celsius > 0 && celsius < 125) return +(celsius.toFixed(1));
        }
      } catch (_) {}
    }
    return 0.0;
  }

  getCpuUsage() {
    const currentCpus = os.cpus();
    let idleDiff = 0;
    let totalDiff = 0;

    for (let i = 0; i < currentCpus.length; i++) {
      const prev = this.lastCpus[i] ? this.lastCpus[i].times : null;
      const curr = currentCpus[i].times;

      if (prev) {
        const prevTotal = prev.user + prev.nice + prev.sys + prev.idle + prev.irq;
        const currTotal = curr.user + curr.nice + curr.sys + curr.idle + curr.irq;
        totalDiff += (currTotal - prevTotal);
        idleDiff += (curr.idle - prev.idle);
      }
    }

    this.lastCpus = currentCpus;
    if (totalDiff === 0) return 0.0;
    const usage = ((1 - idleDiff / totalDiff) * 100);
    return +(Math.max(0, Math.min(100, usage)).toFixed(1));
  }

  async getDiskUsage() {
    const rootPath = os.platform() === 'win32' ? 'C:\\' : '/';
    try {
      if (fs.promises.statfs) {
        const stat = await fs.promises.statfs(rootPath);
        if (stat.blocks > 0) {
          const used = stat.blocks - stat.bfree;
          return +((used / stat.blocks) * 100).toFixed(1);
        }
      }
    } catch (_) {}
    return 0.0;
  }

  getPmicReport() {
    const platform = os.platform();

    // 1. Linux platforms
    if (platform === 'linux') {
      // 1-A. Raspberry Pi 5 (Renesas DA9091 PMIC via vcgencmd)
      try {
        const out = execSync('vcgencmd pmic_read_adc 2>/dev/null', { timeout: 1500 }).toString();
        if (out && out.includes('volt(')) {
          const lines = out.split('\n');
          const rails = {};
          for (const line of lines) {
            const m = line.trim().match(/^([A-Z0-9_]+)_(A|V)\s+(?:current|volt)\(\d+\)=([\d.]+)%?[AV]?/);
            if (m) {
              const rail = m[1];
              const type = m[2];
              const val = parseFloat(m[3]);
              if (!rails[rail]) rails[rail] = { voltage: null, current: null, power_w: null };
              if (type === 'V') rails[rail].voltage = +(val.toFixed(3));
              if (type === 'A') rails[rail].current = +(val.toFixed(3));
            }
          }

          let totalPower = 0.0;
          for (const r of Object.values(rails)) {
            if (r.voltage !== null && r.current !== null && r.voltage > 0 && r.current > 0) {
              r.power_w = +(r.voltage * r.current).toFixed(3);
              totalPower += r.power_w;
            }
          }

          const ext5v = rails['EXT5V'] ? rails['EXT5V'].voltage : null;
          const coreV = rails['VDD_CORE'] ? rails['VDD_CORE'].voltage : null;
          const coreA = rails['VDD_CORE'] ? rails['VDD_CORE'].current : null;

          let summary = '';
          if (ext5v) summary += `${ext5v.toFixed(2)}V in`;
          if (coreV && coreA) summary += ` • ${coreV.toFixed(2)}V @ ${coreA.toFixed(2)}A core`;
          if (totalPower > 0) summary += ` • ${totalPower.toFixed(1)}W`;

          return {
            supported: true,
            type: 'Renesas DA9091 (RPi 5)',
            input_voltage: ext5v,
            core_voltage: coreV,
            core_current: coreA,
            power_w: +(totalPower.toFixed(2)),
            summary: summary || 'DA9091 PMIC Active',
            rails,
          };
        }
      } catch (_) {}

      // 1-B. Rockchip RK3588 (Orange Pi 5 / RK806 PMIC regulators)
      try {
        const regDir = '/sys/class/regulator';
        if (fs.existsSync(regDir)) {
          const dirs = fs.readdirSync(regDir).filter(f => f.startsWith('regulator.'));
          const rails = {};
          let isRk = false;

          for (const d of dirs) {
            try {
              const p = `${regDir}/${d}`;
              const name = fs.readFileSync(`${p}/name`, 'utf8').trim();
              if (!name || name.includes('dummy')) continue;
              if (name.includes('rk806') || name.startsWith('vdd_') || name.startsWith('vcc5v0')) {
                isRk = true;
              }
              const uVStr = fs.readFileSync(`${p}/microvolts`, 'utf8').trim();
              const uV = parseInt(uVStr, 10);
              if (!isNaN(uV) && uV > 0) {
                rails[name] = { voltage: +(uV / 1000000).toFixed(3), current: null, power_w: null };
              }
            } catch (_) {}
          }

          if (isRk && Object.keys(rails).length > 0) {
            const v5 = rails['vcc5v0_sys'] ? rails['vcc5v0_sys'].voltage : null;
            const vLit = rails['vdd_cpu_lit_s0'] ? rails['vdd_cpu_lit_s0'].voltage : null;
            const vBig0 = rails['vdd_cpu_big0_s0'] ? rails['vdd_cpu_big0_s0'].voltage : null;
            const vNpu = rails['vdd_npu_s0'] ? rails['vdd_npu_s0'].voltage : null;

            let summary = 'RK806 PMIC';
            if (v5) summary = `${v5.toFixed(2)}V in`;
            if (vLit) summary += ` • Core: ${vLit.toFixed(2)}V`;
            if (vNpu) summary += ` • NPU: ${vNpu.toFixed(2)}V`;

            return {
              supported: true,
              type: 'Rockchip RK806 PMIC',
              input_voltage: v5,
              core_voltage: vLit || vBig0,
              core_current: null,
              power_w: null,
              summary,
              rails,
            };
          }
        }
      } catch (_) {}

      // 1-C. Intel RAPL Power Meter (x86 Linux / Proxmox VE)
      try {
        const raplPkg = '/sys/class/powercap/intel-rapl/intel-rapl:0';
        if (fs.existsSync(`${raplPkg}/energy_uj`)) {
          const now = Date.now();
          const currEnergy = parseInt(fs.readFileSync(`${raplPkg}/energy_uj`, 'utf8').trim(), 10);
          let powerW = null;

          if (this.lastRaplEnergy && this.lastRaplTime && now > this.lastRaplTime) {
            let de = currEnergy - this.lastRaplEnergy;
            const dt = (now - this.lastRaplTime) / 1000;
            if (de < 0) {
              try {
                const maxRange = parseInt(fs.readFileSync(`${raplPkg}/max_energy_range_uj`, 'utf8').trim(), 10);
                if (maxRange > 0) de += maxRange;
              } catch (_) {}
            }
            if (de >= 0 && dt > 0) {
              powerW = +((de / 1000000) / dt).toFixed(2);
            }
          }

          this.lastRaplEnergy = currEnergy;
          this.lastRaplTime = now;

          const summary = powerW !== null ? `CPU Package: ${powerW.toFixed(1)}W (RAPL)` : 'Intel RAPL Active';
          return {
            supported: true,
            type: 'Intel RAPL Power Meter',
            input_voltage: null,
            core_voltage: null,
            core_current: null,
            power_w: powerW,
            summary,
            rails: {
              'package-0': { voltage: null, current: null, power_w: powerW }
            },
          };
        }
      } catch (_) {}
    } else if (platform === 'win32') {
      try {
        return {
          supported: true,
          type: 'Windows ACPI / Intel Core',
          input_voltage: null,
          core_voltage: null,
          core_current: null,
          power_w: null,
          summary: 'Intel Alder Lake • ACPI Online',
          rails: {},
        };
      } catch (_) {}
    }

    return { supported: false, reason: 'No hardware PMIC detected' };
  }

  async collectMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = +(((totalMem - freeMem) / totalMem) * 100).toFixed(1);

    const cpuUsage = this.getCpuUsage();
    const diskUsage = await this.getDiskUsage();
    const loadAvg = os.loadavg().map(x => +(x.toFixed(2)));
    const cpuTemp = this.getCpuTemp();
    const pmic = this.getPmicReport();

    return {
      node_id: this.nodeId,
      os: this.osName,
      cpu_temp: cpuTemp,
      cpu_usage: cpuUsage,
      mem_usage: memUsage,
      disk_usage: diskUsage,
      load_avg: loadAvg,
      uptime: Math.round(os.uptime()),
      ip_address: this.ipAddress,
      hostname: this.hostname,
      pmic: pmic,
      timestamp: Date.now() / 1000,
    };
  }

  async sendMetrics() {
    const endpoint = `${this.serverUrl}/api/metrics`;
    try {
      const metrics = await this.collectMetrics();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (res.ok) {
        // console.log(`[Agent] Transmitted metrics for ${this.nodeId}`);
      } else {
        console.warn(`[Agent] Server returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`[Agent] Cannot reach server at ${endpoint} (${err.message}). Retrying...`);
    }
  }

  start() {
    console.log(`[Agent] Monitoring agent started for node: ${this.nodeId}`);
    console.log(`[Agent] Target server: ${this.serverUrl} (Interval: ${this.interval / 1000}s)`);

    // Initial transmission
    this.sendMetrics();

    this.timer = setInterval(() => {
      this.sendMetrics();
    }, this.interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    console.log('[Agent] Stopped.');
  }
}

if (require.main === module) {
  const agent = new MonitoringAgent();
  agent.start();

  process.on('SIGINT', () => {
    agent.stop();
    process.exit(0);
  });
}

module.exports = { MonitoringAgent };
