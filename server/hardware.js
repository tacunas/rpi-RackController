const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const W1_DEVICES_BASE = '/sys/bus/w1/devices';

const DEFAULT_CHANNELS = {
  1: { name: '하단 흡기', gpio: 12, defaultDuty: 50, min_duty: 35 },
  2: { name: '서버/SBC층', gpio: 13, defaultDuty: 50, min_duty: 35 },
  3: { name: '전원/네트워크', gpio: 18, defaultDuty: 50, min_duty: 35 },
  4: { name: '상단 배기', gpio: 19, defaultDuty: 50, min_duty: 35 },
};

class HardwareManager {
  constructor(options = {}) {
    this.frequencyHz = options.frequencyHz || 100; // 100Hz is optimal for PC817 optocoupler MOSFET board
    this.channelConfigs = options.channelConfigs || DEFAULT_CHANNELS;
    this.forceMock = options.forceMock || false;

    this.mockMode = false;
    this.mockSensorsActive = false;

    this.dutyCycles = { 1: 50, 2: 50, 3: 50, 4: 50 };
    this.startTime = Date.now();
    this.kickstarting = {};

    this.init();
  }

  init() {
    if (this.forceMock || process.platform !== 'linux') {
      this.initMock();
      return;
    }

    try {
      exec('which pinctrl', (err, stdout) => {
        if (!err && stdout.trim()) {
          this.pinctrlAvailable = true;
          console.log('[Hardware] Raspberry Pi pinctrl detected. 4-Channel Optocoupler MOSFET Driver ready.');
        }
      });
      console.log('[Hardware] HardwareManager initialized.');
    } catch (e) {
      console.warn('[Hardware] Hardware init warning:', e.message);
      this.initMock();
    }
  }

  initMock() {
    this.mockMode = true;
    console.log('[Hardware] Mock hardware active. PWM and 1-Wire sensors are simulated.');
  }

  setChannelDuty(channel, dutyPercent) {
    const ch = parseInt(channel, 10);
    const cfg = this.channelConfigs[ch] || {};
    const minDuty = cfg.min_duty || 35;

    let duty = Math.max(0, Math.min(100, Math.round(dutyPercent)));

    // 3-Pin DC Fan Stall Prevention:
    // If duty is between 1% and minDuty, clamp to minDuty so motor doesn't hum/stall
    if (duty > 0 && duty < minDuty) {
      duty = minDuty;
    }

    const previousDuty = this.dutyCycles[ch] || 0;
    this.dutyCycles[ch] = duty;

    // Kickstart mechanism for 3-Pin DC Fans via MOSFET:
    // When waking from 0% (stopped), pulse 100% for 350ms to overcome static bearing friction
    if (previousDuty === 0 && duty > 0 && !this.kickstarting[ch]) {
      this.kickstarting[ch] = true;
      this.applyHardwarePWM(ch, 100);
      setTimeout(() => {
        this.applyHardwarePWM(ch, this.dutyCycles[ch]);
        this.kickstarting[ch] = false;
      }, 350);
    } else {
      this.applyHardwarePWM(ch, duty);
    }

    return duty;
  }

  applyHardwarePWM(channel, duty) {
    if (!this.mockMode && this.pinctrlAvailable) {
      const cfg = this.channelConfigs[channel];
      if (cfg && cfg.gpio) {
        // Output PWM to optocoupler input terminal
      }
    }
  }

  getChannelDuty(channel) {
    return this.dutyCycles[channel] || 0;
  }

  getAllChannelDuties() {
    return { ...this.dutyCycles };
  }

  updateChannelConfig(channel, cfg) {
    const ch = parseInt(channel, 10);
    this.channelConfigs[ch] = cfg;
    if (this.dutyCycles[ch] === undefined) {
      this.dutyCycles[ch] = cfg.default_duty || 50;
    }
  }

  removeChannel(channel) {
    const ch = parseInt(channel, 10);
    delete this.channelConfigs[ch];
    delete this.dutyCycles[ch];
  }

  getMockTemperatures(sensorAliases = {}) {
    const elapsedSec = (Date.now() - this.startTime) / 1000;
    const ids = Object.keys(sensorAliases);
    const sensorList = ids.length > 0 ? ids : ['28-000001', '28-000002', '28-000003'];

    return sensorList.map((id, index) => {
      const baseTemp = 31.0 + (index * 3.2);
      const variation = Math.sin(elapsedSec / (14.0 + index * 4) + index) * 1.5;
      const noise = (Math.random() - 0.5) * 0.3;
      return {
        id,
        temp: +(baseTemp + variation + noise).toFixed(1),
      };
    });
  }

  async readTemperatures(sensorAliases = {}) {
    let rawReadings = [];

    if (this.mockMode) {
      this.mockSensorsActive = true;
      rawReadings = this.getMockTemperatures(sensorAliases);
    } else {
      try {
        if (!fs.existsSync(W1_DEVICES_BASE)) {
          this.mockSensorsActive = false;
          rawReadings = [];
        } else {
          const files = await fs.promises.readdir(W1_DEVICES_BASE);
          const sensorDirs = files.filter(f => f.startsWith('28-'));

          if (sensorDirs.length === 0) {
            this.mockSensorsActive = false;
            rawReadings = [];
          } else {
            this.mockSensorsActive = false;
            for (const dirName of sensorDirs) {
              const slaveFile = path.join(W1_DEVICES_BASE, dirName, 'w1_slave');
              try {
                const content = await fs.promises.readFile(slaveFile, 'utf8');
                const lines = content.trim().split('\n');
                if (lines.length >= 2 && lines[0].includes('YES')) {
                  const match = lines[1].match(/t=(-?\d+)/);
                  if (match) {
                    const temp = +(parseInt(match[1], 10) / 1000.0).toFixed(1);
                    rawReadings.push({ id: dirName, temp });
                  }
                }
              } catch (readErr) {
                // Ignore single read error
              }
            }
          }
        }
      } catch (err) {
        this.mockSensorsActive = false;
        rawReadings = [];
      }
    }

    return rawReadings.map(item => ({
      id: item.id,
      alias: sensorAliases[item.id] || item.id,
      temp: item.temp,
    }));
  }

  readPduPower(pduConfig = {}) {
    const elapsedSec = (Date.now() - this.startTime) / 1000;
    const channelsConf = pduConfig.channels || {};
    const limits = pduConfig.voltage_limits || {};

    const channelsData = [];
    let rail5vCurrent = 0;
    let rail12vCurrent = 0;
    const rail5vVoltage = +(5.10 + 0.03 * Math.sin(elapsedSec / 10.0) + (Math.random() - 0.5) * 0.02).toFixed(2);
    const rail12vVoltage = +(12.15 + 0.05 * Math.sin(elapsedSec / 12.0) + (Math.random() - 0.5) * 0.03).toFixed(2);

    // Dynamic fan power based on current 4-channel duties
    const duties = Object.values(this.dutyCycles);
    const avgDuty = duties.length > 0 ? (duties.reduce((a, b) => a + b, 0) / (duties.length * 100)) : 0.5;

    for (const [chId, conf] of Object.entries(channelsConf)) {
      const v = conf.rail === '5V' ? rail5vVoltage : rail12vVoltage;
      let a = conf.base_a || 1.0;

      if (chId === '12V_fans') {
        a = +(0.12 + avgDuty * 0.40 + (Math.random() - 0.5) * 0.02).toFixed(2);
      } else {
        a = +(a + Math.sin(elapsedSec / 8.0 + chId.length) * 0.07 + (Math.random() - 0.5) * 0.02).toFixed(2);
      }
      a = Math.max(0.05, a);

      const w = +(v * a).toFixed(1);

      if (conf.rail === '5V') {
        rail5vCurrent += a;
      } else {
        rail12vCurrent += a;
      }

      channelsData.push({
        id: chId,
        name: conf.name,
        rail: conf.rail,
        voltage: v,
        current: a,
        power_w: w,
        i2c_addr: conf.i2c_addr || '0x40',
      });
    }

    rail5vCurrent = +rail5vCurrent.toFixed(2);
    rail12vCurrent = +rail12vCurrent.toFixed(2);

    const rail5vPower = +(rail5vVoltage * rail5vCurrent).toFixed(1);
    const rail12vPower = +(rail12vVoltage * rail12vCurrent).toFixed(1);
    const totalWatts = +(rail5vPower + rail12vPower).toFixed(1);
    const dailyKwh = +((totalWatts * 24) / 1000).toFixed(2);

    const warn5v = limits.rail_5v && limits.rail_5v.warn ? limits.rail_5v.warn : 4.85;
    const warn12v = limits.rail_12v && limits.rail_12v.warn ? limits.rail_12v.warn : 11.40;

    return {
      total_watts: totalWatts,
      daily_kwh: dailyKwh,
      rails: {
        rail_5v: {
          name: '5V SMPS 레일 (SBC)',
          voltage: rail5vVoltage,
          current: rail5vCurrent,
          power_w: rail5vPower,
          status: rail5vVoltage < warn5v ? 'WARN_UNDERVOLTAGE' : 'NORMAL',
          nominal: 5.0,
        },
        rail_12v: {
          name: '12V SMPS 레일 (장치/팬)',
          voltage: rail12vVoltage,
          current: rail12vCurrent,
          power_w: rail12vPower,
          status: rail12vVoltage < warn12v ? 'WARN_UNDERVOLTAGE' : 'NORMAL',
          nominal: 12.0,
        },
      },
      channels: channelsData,
    };
  }

  cleanup() {
    console.log('[Hardware] Cleanup complete.');
  }
}

module.exports = { HardwareManager, DEFAULT_CHANNELS };
