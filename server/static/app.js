// State Management
const state = {
  autoMode: true,
  mockMode: false,
  isDragging: {},
  pendingDuties: {},
  nodes: {},
  nodeList: [],
  sensors: [],
  fans: [],
  fanRules: [],
  fanCurve: {},
  pdu: null,
  displayOrder: {},
  pollTimer: null,
  isPolling: false,
  editingSensor: null,
  editingFan: null,
  editingPdu: null,
  reorderModal: {
    type: null,
    items: [],
  },
  fanSettingsList: [],
  sensorsSettingsList: [],
  pduSettingsList: [],
  nodesSettingsList: [],
  occupancyMode: 'home',
  homeMaxDuty: 50,
  awayMaxDuty: 100,
  isDraggingOccupancyHome: false,
  isDraggingOccupancyAway: false,
  currentSettingsTab: 'rules',
};

// Top Summary & Surface DOM Elements
const hwModeBadge = document.getElementById("hw-mode-badge");
const onlineCount = document.getElementById("online-count");
const topRackTemp = document.getElementById("top-rack-temp");
const fanModeBadge = document.getElementById("fan-mode-badge");
const topTotalPower = document.getElementById("top-total-power");
const sensorsGrid = document.getElementById("sensors-grid");
const fanChannelsGrid = document.getElementById("fan-channels-grid");
const nodesGrid = document.getElementById("nodes-grid");
const modeAutoBtn = document.getElementById("mode-auto-btn");
const modeManualBtn = document.getElementById("mode-manual-btn");

// PDU Surface Elements
const pduTotalWatts = document.getElementById("pdu-total-watts");
const pduDailyKwh = document.getElementById("pdu-daily-kwh");
const voltsRail5v = document.getElementById("volts-rail-5v");
const currentRail5v = document.getElementById("current-rail-5v");
const powerRail5v = document.getElementById("power-rail-5v");
const badgeRail5v = document.getElementById("badge-rail-5v");
const dotRail5v = document.getElementById("dot-rail-5v");

const voltsRail12v = document.getElementById("volts-rail-12v");
const currentRail12v = document.getElementById("current-rail-12v");
const powerRail12v = document.getElementById("power-rail-12v");
const badgeRail12v = document.getElementById("badge-rail-12v");
const dotRail12v = document.getElementById("dot-rail-12v");

const pduChannelsGrid = document.getElementById("pdu-channels-grid");

// Admin Login Modal Elements
const adminLoginModal = document.getElementById("admin-login-modal");
const adminLoginForm = document.getElementById("admin-login-form");
const adminLoginError = document.getElementById("admin-login-error");
const adminUsernameInput = document.getElementById("admin-username-input");
const adminPasswordInput = document.getElementById("admin-password-input");
const cancelLoginBtn = document.getElementById("cancel-login-btn");

// Unified Settings Modal Elements
const openSettingsBtn = document.getElementById("open-settings-btn");
const fanSettingsModal = document.getElementById("fan-settings-modal");
const closeFanSettingsBtn = document.getElementById("close-fan-settings-btn");
const btnAdminLogout = document.getElementById("btn-admin-logout");

// Settings Tab Buttons
const tabBtnFanRules = document.getElementById("tab-btn-fan-rules");
const tabBtnFanChannels = document.getElementById("tab-btn-fan-channels");
const tabBtnSensors = document.getElementById("tab-btn-sensors");
const tabBtnPdu = document.getElementById("tab-btn-pdu");
const tabBtnNodes = document.getElementById("tab-btn-nodes");

// Settings Panels
const panelFanRules = document.getElementById("panel-fan-rules");
const panelFanChannels = document.getElementById("panel-fan-channels");
const panelSensors = document.getElementById("panel-sensors");
const panelPdu = document.getElementById("panel-pdu");
const panelNodes = document.getElementById("panel-nodes");

// Fan Rules & Occupancy Panel Elements
const btnModeHome = document.getElementById("btn-mode-home");
const btnModeAway = document.getElementById("btn-mode-away");
const inputHomeMaxDuty = document.getElementById("input-home-max-duty");
const labelHomeMaxDuty = document.getElementById("label-home-max-duty");
const inputAwayMaxDuty = document.getElementById("input-away-max-duty");
const labelAwayMaxDuty = document.getElementById("label-away-max-duty");

const fanRulesList = document.getElementById("fan-rules-list");
const btnAddFanRule = document.getElementById("btn-add-fan-rule");
const btnSaveFanRules = document.getElementById("btn-save-fan-rules");

// Fan Channels Panel Elements
const fanSettingsChannelsList = document.getElementById("fan-settings-channels-list");
const btnFanSettingsAdd = document.getElementById("btn-fan-settings-add");
const btnSaveFanOrder = document.getElementById("btn-save-fan-order");

// Sensors Panel Elements
const settingsSensorsList = document.getElementById("settings-sensors-list");
const btnSettingsAddSensor = document.getElementById("btn-settings-add-sensor");
const btnSaveSensorsOrder = document.getElementById("btn-save-sensors-order");

// PDU Panel Elements
const settingsPduList = document.getElementById("settings-pdu-list");
const btnSettingsAddPdu = document.getElementById("btn-settings-add-pdu");
const btnSavePduOrder = document.getElementById("btn-save-pdu-order");

// Nodes Panel Elements
const settingsNodesList = document.getElementById("settings-nodes-list");
const btnSaveNodesOrder = document.getElementById("btn-save-nodes-order");

// Sensor Modal Elements
const sensorModal = document.getElementById("sensor-modal");
const sensorModalTitle = document.getElementById("sensor-modal-title");
const sensorForm = document.getElementById("sensor-form");
const sensorIdInput = document.getElementById("sensor-id-input");
const sensorAliasInput = document.getElementById("sensor-alias-input");
const cancelSensorBtn = document.getElementById("cancel-sensor-btn");

// Fan Modal Elements
const fanModal = document.getElementById("fan-modal");
const fanModalTitle = document.getElementById("fan-modal-title");
const fanForm = document.getElementById("fan-form");
const fanChannelInput = document.getElementById("fan-channel-input");
const fanGpioInput = document.getElementById("fan-gpio-input");
const fanNameInput = document.getElementById("fan-name-input");
const fanPinTypeInput = document.getElementById("fan-pin-type-input");
const fanMinDutyInput = document.getElementById("fan-min-duty-input");
const fanDefaultDutyInput = document.getElementById("fan-default-duty-input");
const cancelFanBtn = document.getElementById("cancel-fan-btn");

// PDU Modal Elements
const pduModal = document.getElementById("pdu-modal");
const pduModalTitle = document.getElementById("pdu-modal-title");
const pduForm = document.getElementById("pdu-form");
const pduIdInput = document.getElementById("pdu-id-input");
const pduRailSelect = document.getElementById("pdu-rail-select");
const pduNameInput = document.getElementById("pdu-name-input");
const pduI2cInput = document.getElementById("pdu-i2c-input");
const pduBaseAInput = document.getElementById("pdu-base-a-input");
const cancelPduBtn = document.getElementById("cancel-pdu-btn");

// PMIC Modal Elements
const pmicModal = document.getElementById("pmic-modal");
const pmicModalTitle = document.getElementById("pmic-modal-title");
const pmicModalSubtitle = document.getElementById("pmic-modal-subtitle");
const pmicModalSummaryBox = document.getElementById("pmic-modal-summary-box");
const pmicRailsCount = document.getElementById("pmic-rails-count");
const pmicRailsList = document.getElementById("pmic-rails-list");
const closePmicBtn = document.getElementById("close-pmic-btn");
const btnPmicClose = document.getElementById("btn-pmic-close");

// Reorder Modal Elements
const reorderModal = document.getElementById("reorder-modal");
const reorderModalTitle = document.getElementById("reorder-modal-title");
const reorderItemsList = document.getElementById("reorder-items-list");
const closeReorderBtn = document.getElementById("close-reorder-btn");
const cancelReorderBtn = document.getElementById("cancel-reorder-btn");
const saveReorderBtn = document.getElementById("save-reorder-btn");

// HTML Escape Helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Format Uptime in English
function formatUptime(seconds) {
  if (!seconds || seconds <= 0) return "Just started";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Progress Bar Color Helper
function getProgressColor(percent) {
  if (percent >= 85) return "bg-rose-500";
  if (percent >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

// Short OS Name Helper
function getShortOs(os) {
  if (!os) return 'Unknown OS';
  const l = os.toLowerCase();
  if (l.includes('win')) return 'Windows';
  if (l.includes('proxmox')) return 'Proxmox VE';
  if (l.includes('orange')) return 'Orange Pi OS';
  if (l.includes('raspb')) return 'Raspberry Pi OS';
  if (l.includes('ubuntu')) return 'Ubuntu';
  if (l.includes('debian')) return 'Debian';
  if (os.length > 16) return os.substring(0, 15) + '…';
  return os;
}

// System Status Polling
async function fetchStatus() {
  if (state.isPolling) return;
  state.isPolling = true;

  try {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    state.autoMode = data.auto_mode;
    state.mockMode = data.mock_mode;
    state.sensors = data.sensors || [];
    state.fans = data.fans || [];
    state.nodes = data.nodes || {};
    state.nodeList = data.node_list || Object.values(data.nodes || {});
    state.pdu = data.pdu || null;
    state.displayOrder = data.display_order || {};
    state.fanRules = data.fan_rules || [];
    state.fanCurve = data.fan_curve || {};
    state.occupancyMode = data.occupancy_mode || 'home';
    const isInteractingOccupancy = state.isDraggingOccupancyHome || 
                                   state.isDraggingOccupancyAway || 
                                   (Date.now() - lastOccupancySliderInteraction < 2500);

    if (!isInteractingOccupancy) {
      state.homeMaxDuty = data.home_max_duty ?? 50;
      state.awayMaxDuty = data.away_max_duty ?? 100;
    }

    try { updateOccupancyUI(); } catch (e) { console.error("updateOccupancyUI error:", e); }
    try { updateHeader(data); } catch (e) { console.error("updateHeader error:", e); }
    try { renderSensors(state.sensors); } catch (e) { console.error("renderSensors error:", e); }
    try { renderFans(state.fans, data.auto_mode); } catch (e) { console.error("renderFans error:", e); }
    try { renderPdu(state.pdu); } catch (e) { console.error("renderPdu error:", e); }
    try { renderNodes(state.nodeList); } catch (e) { console.error("renderNodes error:", e); }
  } catch (err) {
    console.warn("Polling error:", err);
  } finally {
    state.isPolling = false;
  }
}

// Update Header Summary Badges
function updateHeader(data) {
  // HW Mode Badge
  if (hwModeBadge) {
    if (data.mock_mode) {
      hwModeBadge.textContent = "MOCK SIMULATION";
      hwModeBadge.className = "text-xs px-2 py-0.5 rounded-full font-medium bg-amber-950 text-amber-400 border border-amber-800";
    } else {
      hwModeBadge.textContent = "REAL HW";
      hwModeBadge.className = "text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-950 text-emerald-400 border border-emerald-800";
    }
  }

  // Online Nodes Count (Strict real total count without artificial minimum)
  if (onlineCount) {
    onlineCount.textContent = `${data.online_nodes_count} / ${data.total_nodes_count}`;
    if (data.online_nodes_count === 0) {
      onlineCount.className = "font-bold text-slate-500";
    } else if (data.online_nodes_count < data.total_nodes_count) {
      onlineCount.className = "font-bold text-amber-400";
    } else {
      onlineCount.className = "font-bold text-emerald-400";
    }
  }

  // Max Rack Temp
  if (topRackTemp) {
    if (data.max_rack_temp !== null && data.max_rack_temp !== undefined) {
      topRackTemp.textContent = `${data.max_rack_temp.toFixed(1)} °C`;
      if (data.max_rack_temp >= 45.0) {
        topRackTemp.className = "font-bold text-rose-400 animate-pulse";
      } else {
        topRackTemp.className = "font-bold text-orange-400";
      }
    } else {
      topRackTemp.textContent = "--.- °C";
      topRackTemp.className = "font-bold text-slate-500";
    }
  }

  // Fan Mode Badge with Occupancy Indicator
  if (fanModeBadge) {
    const occTag = (data.occupancy_mode === 'away') ? 'Away 🚶' : 'Home 🏠';
    if (data.auto_mode) {
      fanModeBadge.textContent = `AUTO (${data.target_fan_duty}%) • ${occTag}`;
      fanModeBadge.className = "font-bold text-cyan-400";
      if (modeAutoBtn) modeAutoBtn.className = "px-3 py-1 text-xs font-medium rounded-lg transition-all bg-cyan-600 text-white shadow";
      if (modeManualBtn) modeManualBtn.className = "px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition-all";
    } else {
      fanModeBadge.textContent = `MANUAL • ${occTag}`;
      fanModeBadge.className = "font-bold text-amber-400";
      if (modeManualBtn) modeManualBtn.className = "px-3 py-1 text-xs font-medium rounded-lg transition-all bg-amber-600 text-white shadow";
      if (modeAutoBtn) modeAutoBtn.className = "px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition-all";
    }
  }

  // Total Power Badge
  if (topTotalPower && data.pdu && data.pdu.total_watts !== undefined) {
    topTotalPower.textContent = `${data.pdu.total_watts.toFixed(1)} W`;
  }
}

// 1. Render Rack Temperature Sensors (No Surface Buttons, No Sensor Address)
function renderSensors(sensors) {
  if (!sensorsGrid) return;
  if (!sensors || sensors.length === 0) {
    sensorsGrid.innerHTML = `
      <div class="col-span-full bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
        No 1-Wire temperature sensors detected. Configure sensors in Settings.
      </div>
    `;
    return;
  }

  sensorsGrid.innerHTML = sensors.map((s) => {
    const hasTemp = typeof s.temp === 'number' && !isNaN(s.temp);
    const isAlert = hasTemp && s.temp >= 45.0;
    const alertBorder = isAlert ? "border-rose-500/80 bg-rose-950/20 shadow-lg shadow-rose-950/30" : "border-slate-800 bg-slate-900/80";
    const tempColor = isAlert ? "text-rose-400" : (hasTemp ? "text-white" : "text-slate-500");
    const tempFormatted = hasTemp ? s.temp.toFixed(1) : "--.-";

    return `
      <div class="border ${alertBorder} rounded-xl p-4 transition-all hover:border-slate-700 relative">
        <div class="flex items-start justify-between">
          <div class="truncate pr-2">
            <h3 class="text-sm font-semibold text-slate-200 truncate" title="${escapeHtml(s.alias)}">${escapeHtml(s.alias)}</h3>
          </div>
        </div>
        <div class="mt-3 flex items-baseline justify-between">
          <span class="text-2xl font-black tracking-tight ${tempColor}">${tempFormatted}</span>
          <span class="text-sm font-medium text-slate-400">°C</span>
        </div>
        ${isAlert ? `<div class="mt-2 text-[11px] font-medium text-rose-400 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          High Temp Alert (>= 45°C)
        </div>` : (!hasTemp ? `<div class="mt-2 text-[11px] text-slate-500 flex items-center gap-1 font-mono">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
          Waiting for 1-Wire signal...
        </div>` : '')}
      </div>
    `;
  }).join("");
}

// 2. Render Fan Channels (No Surface Edit/Delete/Reorder, No GPIO info)
function renderFans(fans, autoMode) {
  if (!fanChannelsGrid) return;
  if (!fans || fans.length === 0) {
    fanChannelsGrid.innerHTML = `
      <div class="col-span-full bg-slate-950/80 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
        No fan channels configured. Configure fans in Settings.
      </div>
    `;
    return;
  }

  fanChannelsGrid.innerHTML = fans.map((fan) => {
    const ch = fan.channel;
    const duty = fan.duty_cycle;
    const spinSpeed = duty > 0 ? `${Math.max(0.3, 2.5 - (duty / 100) * 2.1).toFixed(2)}s` : '0s';
    const isSpinning = duty > 0 ? 'fan-spinning' : '';
    const pinType = fan.pin_type || '3-Pin';
    const pinBadgeClass = pinType.includes('4')
      ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
      : 'bg-amber-950/80 text-amber-300 border-amber-800/80';

    return `
      <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between" id="fan-card-${ch}">
        <div>
          <!-- Header: Spinning Icon + Name + Pin Badge -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center space-x-2 min-w-0">
              <div class="text-cyan-400 shrink-0 ${isSpinning}" style="--fan-speed: ${spinSpeed};">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div class="min-w-0 flex items-center space-x-1.5 truncate">
                <span class="text-xs font-bold text-slate-200 shrink-0">CH ${ch}</span>
                <span class="text-xs text-slate-300 font-medium truncate" title="${escapeHtml(fan.name)}">${escapeHtml(fan.name)}</span>
              </div>
            </div>
            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded border ${pinBadgeClass} shrink-0 whitespace-nowrap">
              ${escapeHtml(pinType)}
            </span>
          </div>

          <div class="flex items-baseline justify-between mb-3">
            <span class="text-xl font-bold text-cyan-400" id="duty-text-${ch}">${duty}%</span>
            <span class="text-[11px] ${autoMode ? 'text-cyan-400/80' : 'text-amber-400/80'}">${autoMode ? 'AUTO' : 'MANUAL'}</span>
          </div>

          <!-- Duty Slider -->
          <div class="space-y-1">
            <input
              type="range"
              min="0"
              max="100"
              value="${duty}"
              id="slider-${ch}"
              ${autoMode ? 'disabled' : ''}
              class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed"
              oninput="onSliderInput(${ch}, this.value)"
              onchange="onSliderChange(${ch}, this.value)"
              onmousedown="state.isDragging[${ch}] = true"
              ontouchstart="state.isDragging[${ch}] = true"
              onmouseup="state.isDragging[${ch}] = false"
              ontouchend="state.isDragging[${ch}] = false"
            />
          </div>
        </div>

        <!-- Presets in manual mode -->
        <div class="mt-4 pt-3 border-t border-slate-800/80 flex justify-between gap-1 ${autoMode ? 'opacity-30 pointer-events-none' : ''}">
          <button onclick="setQuickDuty(${ch}, 30)" class="text-[10px] px-1.5 py-1 bg-slate-900 hover:bg-slate-800 rounded text-slate-300 transition-colors">30%</button>
          <button onclick="setQuickDuty(${ch}, 50)" class="text-[10px] px-1.5 py-1 bg-slate-900 hover:bg-slate-800 rounded text-slate-300 transition-colors">50%</button>
          <button onclick="setQuickDuty(${ch}, 80)" class="text-[10px] px-1.5 py-1 bg-slate-900 hover:bg-slate-800 rounded text-slate-300 transition-colors">80%</button>
          <button onclick="setQuickDuty(${ch}, 100)" class="text-[10px] px-1.5 py-1 bg-slate-900 hover:bg-slate-800 rounded text-slate-300 transition-colors">100%</button>
        </div>
      </div>
    `;
  }).join("");

  fans.forEach(fan => {
    const ch = fan.channel;
    const slider = document.getElementById(`slider-${ch}`);
    if (slider && !state.isDragging[ch]) {
      slider.value = fan.duty_cycle;
    }
  });
}

function onSliderInput(channel, value) {
  state.isDragging[channel] = true;
  const label = document.getElementById(`duty-text-${channel}`);
  if (label) label.textContent = `${value}%`;
}

async function onSliderChange(channel, value) {
  state.isDragging[channel] = false;
  await sendFanDutyUpdate(channel, parseInt(value, 10));
}

async function setQuickDuty(channel, duty) {
  const slider = document.getElementById(`slider-${channel}`);
  const label = document.getElementById(`duty-text-${channel}`);
  if (slider) slider.value = duty;
  if (label) label.textContent = `${duty}%`;
  await sendFanDutyUpdate(channel, duty);
}

async function sendFanDutyUpdate(channel, duty) {
  try {
    const payload = {
      auto_mode: false,
      manual_duties: { [String(channel)]: duty }
    };
    const res = await fetch("/api/fans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      await fetchStatus();
    }
  } catch (err) {
    console.error("Failed to update fan duty:", err);
  }
}

async function setFanMode(auto) {
  try {
    const res = await fetch("/api/fans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_mode: auto })
    });
    if (res.ok) {
      await fetchStatus();
    }
  } catch (err) {
    console.error("Failed to set fan mode:", err);
  }
}

if (modeAutoBtn) modeAutoBtn.addEventListener("click", () => setFanMode(true));
if (modeManualBtn) modeManualBtn.addEventListener("click", () => setFanMode(false));

// 3. Render PDU Status (No Surface Buttons, No INA226 connection info)
function renderPdu(pdu) {
  if (!pdu) return;

  if (pduTotalWatts && pdu.total_watts !== undefined && pdu.total_watts !== null) {
    const tw = typeof pdu.total_watts === 'number' ? pdu.total_watts : 0;
    pduTotalWatts.textContent = `${tw.toFixed(1)} W`;
  }
  if (pduDailyKwh && pdu.daily_kwh !== undefined && pdu.daily_kwh !== null) {
    const dk = typeof pdu.daily_kwh === 'number' ? pdu.daily_kwh : 0;
    pduDailyKwh.textContent = `${dk.toFixed(2)} kWh/day`;
  }

  // 5V SMPS Rail
  if (pdu.rails && pdu.rails.rail_5v) {
    const r5 = pdu.rails.rail_5v;
    if (voltsRail5v) voltsRail5v.textContent = `${typeof r5.voltage === 'number' ? r5.voltage.toFixed(2) : '--.--'} V`;
    if (currentRail5v) currentRail5v.textContent = `${typeof r5.current === 'number' ? r5.current.toFixed(2) : '--.--'} A`;
    if (powerRail5v) powerRail5v.textContent = `${typeof r5.power_w === 'number' ? r5.power_w.toFixed(1) : '--.-'} W`;

    if (badgeRail5v && dotRail5v) {
      if (r5.status === "ALERT") {
        badgeRail5v.textContent = "ALERT";
        badgeRail5v.className = "text-[10px] font-medium px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 animate-pulse";
        dotRail5v.className = "w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 animate-ping";
      } else {
        badgeRail5v.textContent = "NORMAL";
        badgeRail5v.className = "text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800";
        dotRail5v.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50";
      }
    }
  }

  // 12V SMPS Rail
  if (pdu.rails && pdu.rails.rail_12v) {
    const r12 = pdu.rails.rail_12v;
    if (voltsRail12v) voltsRail12v.textContent = `${typeof r12.voltage === 'number' ? r12.voltage.toFixed(2) : '--.--'} V`;
    if (currentRail12v) currentRail12v.textContent = `${typeof r12.current === 'number' ? r12.current.toFixed(2) : '--.--'} A`;
    if (powerRail12v) powerRail12v.textContent = `${typeof r12.power_w === 'number' ? r12.power_w.toFixed(1) : '--.-'} W`;

    if (badgeRail12v && dotRail12v) {
      if (r12.status === "ALERT") {
        badgeRail12v.textContent = "ALERT";
        badgeRail12v.className = "text-[10px] font-medium px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 animate-pulse";
        dotRail12v.className = "w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 animate-ping";
      } else {
        badgeRail12v.textContent = "NORMAL";
        badgeRail12v.className = "text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800";
        dotRail12v.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50";
      }
    }
  }

  // Branch Channels Grid
  if (pduChannelsGrid && Array.isArray(pdu.channels)) {
    if (pdu.channels.length === 0) {
      pduChannelsGrid.innerHTML = `
        <div class="col-span-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center text-slate-500 text-xs">
          No PDU branch channels configured. Configure channels in Settings.
        </div>
      `;
      return;
    }

    pduChannelsGrid.innerHTML = pdu.channels.map((ch) => {
      const is5V = ch.rail === "5V";
      const railColorBadge = is5V
        ? "bg-cyan-950 text-cyan-400 border-cyan-800"
        : "bg-amber-950 text-amber-400 border-amber-800";

      const chVoltage = typeof ch.voltage === 'number' ? ch.voltage : 0;
      const chCurrent = typeof ch.current === 'number' ? ch.current : 0;
      const chPower = typeof ch.power_w === 'number' ? ch.power_w : 0;

      const currentFormatted = chCurrent >= 1.0
        ? `${chCurrent.toFixed(2)} A`
        : `${Math.round(chCurrent * 1000)} mA`;

      let iconSvg = '';
      if (ch.id.includes("fans")) {
        iconSvg = `<svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>`;
      } else if (ch.id.includes("rpi") || ch.id.includes("opi")) {
        iconSvg = `<svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`;
      } else if (ch.id.includes("monitor")) {
        iconSvg = `<svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`;
      } else {
        iconSvg = `<svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z"/></svg>`;
      }

      return `
        <div class="bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all rounded-xl p-3 flex flex-col justify-between">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center space-x-2">
              <span class="p-1 rounded bg-slate-900 border border-slate-800">
                ${iconSvg}
              </span>
              <div>
                <h5 class="text-xs font-semibold text-slate-200 leading-tight" title="${escapeHtml(ch.name)}">${escapeHtml(ch.name)}</h5>
              </div>
            </div>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${railColorBadge}">
              ${ch.rail}
            </span>
          </div>

          <div class="grid grid-cols-3 gap-1.5 text-center mt-1 pt-2 border-t border-slate-900">
            <div class="bg-slate-900/60 py-1 px-1 rounded border border-slate-800/40">
              <span class="text-[9px] text-slate-400 block">Voltage</span>
              <span class="text-xs font-mono font-medium text-cyan-300">${chVoltage.toFixed(2)}V</span>
            </div>
            <div class="bg-slate-900/60 py-1 px-1 rounded border border-slate-800/40">
              <span class="text-[9px] text-slate-400 block">Current</span>
              <span class="text-xs font-mono font-medium text-emerald-400">${currentFormatted}</span>
            </div>
            <div class="bg-slate-900/60 py-1 px-1 rounded border border-slate-800/40">
              <span class="text-[9px] text-slate-400 block">Power</span>
              <span class="text-xs font-mono font-bold text-amber-300">${chPower.toFixed(1)}W</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
}

// 4. Render Cluster Nodes (No Surface Move Buttons)
function renderNodes(nodesInput) {
  if (!nodesGrid) return;
  const nodeList = Array.isArray(nodesInput) ? nodesInput : Object.values(nodesInput || {});

  if (nodeList.length === 0) {
    nodesGrid.innerHTML = `
      <div class="col-span-full bg-slate-950/80 border border-slate-800 rounded-xl p-8 text-center">
        <svg class="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 class="text-sm font-semibold text-slate-300">No Cluster Nodes Connected</h3>
        <p class="text-xs text-slate-500 mt-1">Run <code>rack-agent</code> on each node (Windows, Proxmox, Orange Pi, Raspberry Pi).</p>
      </div>
    `;
    return;
  }

  nodesGrid.innerHTML = nodeList.map((node) => {
    const isOnline = Boolean(node.online);
    const cpuTemp = typeof node.cpu_temp === 'number' ? node.cpu_temp : null;
    const isHighTemp = cpuTemp !== null && cpuTemp >= 75.0;
    const isWarnTemp = cpuTemp !== null && cpuTemp >= 65.0;

    let tempColor = "text-emerald-400";
    if (isHighTemp) tempColor = "text-rose-400 font-bold";
    else if (isWarnTemp) tempColor = "text-amber-400 font-semibold";

    let osBadge = "bg-slate-800 text-slate-300 border border-slate-700";
    const osLower = (node.os || "").toLowerCase();
    if (osLower.includes("win")) osBadge = "bg-blue-950 text-blue-300 border border-blue-800";
    else if (osLower.includes("proxmox")) osBadge = "bg-orange-950 text-orange-300 border border-orange-800";
    else if (osLower.includes("orange")) osBadge = "bg-amber-950 text-amber-300 border border-amber-800";
    else if (osLower.includes("raspb") || osLower.includes("rpi")) osBadge = "bg-rose-950 text-rose-300 border border-rose-800";
    else if (osLower.includes("linux") || osLower.includes("debian") || osLower.includes("ubuntu")) osBadge = "bg-emerald-950 text-emerald-300 border border-emerald-800";

    const osShort = getShortOs(node.os);

    const loadAvgStr = (Array.isArray(node.load_avg) && node.load_avg.length > 0)
      ? node.load_avg.map(v => typeof v === 'number' ? v.toFixed(2) : '-').join(", ")
      : "-";

    const cpuUsage = typeof node.cpu_usage === 'number' ? Math.max(0, node.cpu_usage) : 0;
    const memUsage = typeof node.mem_usage === 'number' ? Math.max(0, node.mem_usage) : 0;
    const diskUsage = typeof node.disk_usage === 'number' ? Math.max(0, node.disk_usage) : 0;

    return `
      <div class="bg-slate-950/80 border ${isOnline ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-60'} rounded-xl p-4 transition-all shadow-sm flex flex-col justify-between">
        <!-- Node Header -->
        <div class="flex items-start justify-between pb-3 border-b border-slate-800/80 gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-2">
              <span class="relative flex h-2.5 w-2.5 shrink-0">
                ${isOnline ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>' : ''}
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-600'}"></span>
              </span>
              <h3 class="text-sm font-bold text-white truncate" title="${escapeHtml(node.node_id)}">${escapeHtml(node.node_id)}</h3>
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${osBadge}" title="${escapeHtml(node.os)}">
                ${escapeHtml(osShort)}
              </span>
            </div>
            <div class="flex items-center space-x-1.5 mt-1 text-xs text-slate-400 font-mono truncate">
              <span class="text-slate-300 font-medium">${escapeHtml(node.hostname || node.node_id)}</span>
              <span>•</span>
              <span>${escapeHtml(node.ip_address || 'IP Unknown')}</span>
            </div>
          </div>

          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${isOnline ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-slate-900 text-slate-500 border-slate-800'}">
            ${isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <!-- Node Vital Stats -->
        <div class="grid grid-cols-2 gap-2 py-3 border-b border-slate-800/80 text-xs">
          <div class="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-slate-400 block">CPU Temp</span>
              <span class="text-sm font-bold ${tempColor} mt-0.5 block">${(cpuTemp !== null && cpuTemp > 0) ? `${cpuTemp.toFixed(1)} °C` : 'N/A'}</span>
            </div>
            <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-slate-400 block">Uptime</span>
              <span class="text-xs font-semibold text-slate-200 mt-0.5 block">${formatUptime(node.uptime)}</span>
            </div>
            <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <!-- Utilization Bars -->
        <div class="space-y-2.5 pt-3 text-xs">
          <!-- CPU -->
          <div>
            <div class="flex justify-between text-slate-300 text-[11px] mb-1">
              <span class="text-slate-400">CPU Usage</span>
              <span class="font-mono font-medium">${cpuUsage.toFixed(1)}%</span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800/50">
              <div class="${getProgressColor(cpuUsage)} h-1.5 rounded-full transition-all duration-500" style="width: ${Math.min(100, cpuUsage)}%"></div>
            </div>
          </div>

          <!-- RAM -->
          <div>
            <div class="flex justify-between text-slate-300 text-[11px] mb-1">
              <span class="text-slate-400">RAM Usage</span>
              <span class="font-mono font-medium">${memUsage.toFixed(1)}%</span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800/50">
              <div class="${getProgressColor(memUsage)} h-1.5 rounded-full transition-all duration-500" style="width: ${Math.min(100, memUsage)}%"></div>
            </div>
          </div>

          <!-- Disk -->
          <div>
            <div class="flex justify-between text-slate-300 text-[11px] mb-1">
              <span class="text-slate-400">Disk Usage</span>
              <span class="font-mono font-medium">${diskUsage.toFixed(1)}%</span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800/50">
              <div class="${getProgressColor(diskUsage)} h-1.5 rounded-full transition-all duration-500" style="width: ${Math.min(100, diskUsage)}%"></div>
            </div>
          </div>
        </div>

        <!-- Load Average Footer -->
        <div class="mt-3 pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/60">
          <span class="text-slate-500 flex items-center gap-1">
            <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Load Avg (1m, 5m, 15m)
          </span>
          <span class="font-mono text-slate-300">${loadAvgStr}</span>
        </div>

        <!-- PMIC Telemetry Button -->
        ${node.pmic && node.pmic.supported ? `
          <div class="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <button onclick="openPmicModal('${escapeHtml(node.node_id)}')" class="flex items-center space-x-1.5 truncate group text-left min-w-0 hover:opacity-90 transition-opacity" title="Click to view detailed PMIC rail metrics">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 group-hover:border-indigo-600 transition-colors shrink-0">
                PMIC
              </span>
              <span class="truncate font-mono text-[11px] text-slate-300 group-hover:text-indigo-300 transition-colors">
                ${escapeHtml(node.pmic.summary || node.pmic.type)}
              </span>
            </button>
            ${(typeof node.pmic.power_w === 'number' && node.pmic.power_w > 0) ? `
              <span class="text-[11px] font-mono font-bold text-indigo-400 shrink-0 ml-1.5">
                ${node.pmic.power_w.toFixed(1)}W
              </span>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join("");
}

// 5. Admin Authentication Logic
function isAdminLoggedIn() {
  return Boolean(localStorage.getItem("rack_auth_token"));
}

function openLoginModal() {
  if (adminLoginError) {
    adminLoginError.textContent = "";
    adminLoginError.classList.add("hidden");
  }
  if (adminLoginForm) adminLoginForm.reset();
  if (adminLoginModal) adminLoginModal.classList.remove("hidden");
  if (adminUsernameInput) adminUsernameInput.focus();
}

function closeLoginModal() {
  if (adminLoginModal) adminLoginModal.classList.add("hidden");
}

if (cancelLoginBtn) cancelLoginBtn.addEventListener("click", closeLoginModal);

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = (adminUsernameInput ? adminUsernameInput.value : "").trim();
    const password = adminPasswordInput ? adminPasswordInput.value : "";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        localStorage.setItem("rack_auth_token", data.token);
        closeLoginModal();
        openSettingsModal();
      } else {
        if (adminLoginError) {
          adminLoginError.textContent = data.error || "Invalid username or password.";
          adminLoginError.classList.remove("hidden");
        }
      }
    } catch (err) {
      if (adminLoginError) {
        adminLoginError.textContent = "Failed to connect to authentication service.";
        adminLoginError.classList.remove("hidden");
      }
    }
  });
}

function handleLogout() {
  localStorage.removeItem("rack_auth_token");
  closeSettingsModal();
}

if (btnAdminLogout) btnAdminLogout.addEventListener("click", handleLogout);

// 6. Unified Settings Modal Logic
function openSettingsProtected(initialTab = 'rules') {
  if (!isAdminLoggedIn()) {
    openLoginModal();
  } else {
    openSettingsModal(initialTab);
  }
}

if (openSettingsBtn) {
  openSettingsBtn.addEventListener("click", () => openSettingsProtected('rules'));
}
if (closeFanSettingsBtn) {
  closeFanSettingsBtn.addEventListener("click", closeSettingsModal);
}

function closeSettingsModal() {
  if (fanSettingsModal) fanSettingsModal.classList.add("hidden");
}

let lastOccupancySliderInteraction = 0;
let occupancySyncTimer = null;

async function syncOccupancyLimits() {
  clearTimeout(occupancySyncTimer);
  occupancySyncTimer = setTimeout(async () => {
    try {
      const homeMax = inputHomeMaxDuty ? parseInt(inputHomeMaxDuty.value, 10) : state.homeMaxDuty;
      const awayMax = inputAwayMaxDuty ? parseInt(inputAwayMaxDuty.value, 10) : state.awayMaxDuty;
      state.homeMaxDuty = homeMax;
      state.awayMaxDuty = awayMax;
      await fetch("/api/config/occupancy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: state.occupancyMode,
          home_max_duty: homeMax,
          away_max_duty: awayMax,
        })
      });
    } catch (err) {
      console.error("Failed to sync occupancy limits:", err);
    }
  }, 150);
}

function updateOccupancyUI() {
  if (btnModeHome && btnModeAway) {
    if (state.occupancyMode === 'home') {
      btnModeHome.className = "px-3 py-1 text-xs font-medium rounded-lg transition-all bg-emerald-600 text-white shadow flex items-center gap-1.5";
      btnModeAway.className = "px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-1.5";
    } else {
      btnModeAway.className = "px-3 py-1 text-xs font-medium rounded-lg transition-all bg-cyan-600 text-white shadow flex items-center gap-1.5";
      btnModeHome.className = "px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-1.5";
    }
  }

  const isInteractingOccupancy = state.isDraggingOccupancyHome || 
                                 state.isDraggingOccupancyAway || 
                                 (Date.now() - lastOccupancySliderInteraction < 2500);

  if (!state.isDraggingOccupancyHome) {
    if (labelHomeMaxDuty) labelHomeMaxDuty.textContent = `${state.homeMaxDuty}%`;
    if (inputHomeMaxDuty && !isInteractingOccupancy) {
      inputHomeMaxDuty.value = state.homeMaxDuty;
    }
  }
  if (!state.isDraggingOccupancyAway) {
    if (labelAwayMaxDuty) labelAwayMaxDuty.textContent = `${state.awayMaxDuty}%`;
    if (inputAwayMaxDuty && !isInteractingOccupancy) {
      inputAwayMaxDuty.value = state.awayMaxDuty;
    }
  }
}

async function setOccupancyMode(mode) {
  state.occupancyMode = mode;
  updateOccupancyUI();
  try {
    const homeMax = inputHomeMaxDuty ? parseInt(inputHomeMaxDuty.value, 10) : state.homeMaxDuty;
    const awayMax = inputAwayMaxDuty ? parseInt(inputAwayMaxDuty.value, 10) : state.awayMaxDuty;
    await fetch("/api/config/occupancy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: state.occupancyMode,
        home_max_duty: homeMax,
        away_max_duty: awayMax,
      })
    });
    await fetchStatus();
  } catch (err) {
    console.error("Failed to set occupancy mode:", err);
  }
}

if (btnModeHome) btnModeHome.addEventListener("click", () => setOccupancyMode('home'));
if (btnModeAway) btnModeAway.addEventListener("click", () => setOccupancyMode('away'));

if (inputHomeMaxDuty) {
  const onHomeStart = () => {
    state.isDraggingOccupancyHome = true;
    lastOccupancySliderInteraction = Date.now();
  };
  const onHomeEnd = () => {
    if (state.isDraggingOccupancyHome) {
      state.isDraggingOccupancyHome = false;
      lastOccupancySliderInteraction = Date.now();
      syncOccupancyLimits();
    }
  };

  inputHomeMaxDuty.addEventListener("pointerdown", onHomeStart);
  inputHomeMaxDuty.addEventListener("mousedown", onHomeStart);
  inputHomeMaxDuty.addEventListener("touchstart", onHomeStart, { passive: true });

  inputHomeMaxDuty.addEventListener("input", (e) => {
    state.isDraggingOccupancyHome = true;
    lastOccupancySliderInteraction = Date.now();
    const val = parseInt(e.target.value, 10);
    state.homeMaxDuty = val;
    if (labelHomeMaxDuty) labelHomeMaxDuty.textContent = `${val}%`;
  });

  inputHomeMaxDuty.addEventListener("change", (e) => {
    state.isDraggingOccupancyHome = false;
    lastOccupancySliderInteraction = Date.now();
    const val = parseInt(e.target.value, 10);
    state.homeMaxDuty = val;
    syncOccupancyLimits();
  });

  inputHomeMaxDuty.addEventListener("pointerup", onHomeEnd);
  inputHomeMaxDuty.addEventListener("mouseup", onHomeEnd);
  inputHomeMaxDuty.addEventListener("touchend", onHomeEnd);
}

if (inputAwayMaxDuty) {
  const onAwayStart = () => {
    state.isDraggingOccupancyAway = true;
    lastOccupancySliderInteraction = Date.now();
  };
  const onAwayEnd = () => {
    if (state.isDraggingOccupancyAway) {
      state.isDraggingOccupancyAway = false;
      lastOccupancySliderInteraction = Date.now();
      syncOccupancyLimits();
    }
  };

  inputAwayMaxDuty.addEventListener("pointerdown", onAwayStart);
  inputAwayMaxDuty.addEventListener("mousedown", onAwayStart);
  inputAwayMaxDuty.addEventListener("touchstart", onAwayStart, { passive: true });

  inputAwayMaxDuty.addEventListener("input", (e) => {
    state.isDraggingOccupancyAway = true;
    lastOccupancySliderInteraction = Date.now();
    const val = parseInt(e.target.value, 10);
    state.awayMaxDuty = val;
    if (labelAwayMaxDuty) labelAwayMaxDuty.textContent = `${val}%`;
  });

  inputAwayMaxDuty.addEventListener("change", (e) => {
    state.isDraggingOccupancyAway = false;
    lastOccupancySliderInteraction = Date.now();
    const val = parseInt(e.target.value, 10);
    state.awayMaxDuty = val;
    syncOccupancyLimits();
  });

  inputAwayMaxDuty.addEventListener("pointerup", onAwayEnd);
  inputAwayMaxDuty.addEventListener("mouseup", onAwayEnd);
  inputAwayMaxDuty.addEventListener("touchend", onAwayEnd);
}

// Window level release listener in case cursor leaves input element
window.addEventListener("pointerup", () => {
  if (state.isDraggingOccupancyHome || state.isDraggingOccupancyAway) {
    state.isDraggingOccupancyHome = false;
    state.isDraggingOccupancyAway = false;
    lastOccupancySliderInteraction = Date.now();
    syncOccupancyLimits();
  }
});
window.addEventListener("mouseup", () => {
  if (state.isDraggingOccupancyHome || state.isDraggingOccupancyAway) {
    state.isDraggingOccupancyHome = false;
    state.isDraggingOccupancyAway = false;
    lastOccupancySliderInteraction = Date.now();
    syncOccupancyLimits();
  }
});

async function openSettingsModal(initialTab = 'rules') {
  // Preload tab lists
  state.fanRules = [...(state.fanRules || [])];
  state.fanSettingsList = [...(state.fans || [])];
  state.sensorsSettingsList = [...(state.sensors || [])];
  state.pduSettingsList = [...((state.pdu && state.pdu.channels) || [])];
  state.nodesSettingsList = [...(state.nodeList || [])];

  // Reset interaction timestamp so modal opens with true server state
  lastOccupancySliderInteraction = 0;
  state.isDraggingOccupancyHome = false;
  state.isDraggingOccupancyAway = false;

  // Preload occupancy config and rules from backend
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const cfg = await res.json();
      const fc = cfg.fan_control || {};
      if (fc.occupancy_mode) state.occupancyMode = fc.occupancy_mode;
      if (fc.home_max_duty !== undefined) state.homeMaxDuty = fc.home_max_duty;
      if (fc.away_max_duty !== undefined) state.awayMaxDuty = fc.away_max_duty;
      if (Array.isArray(fc.rules)) {
        state.fanRules = fc.rules;
      }
    }
  } catch (err) {
    console.error("Failed to load config for settings modal:", err);
  }

  updateOccupancyUI();
  switchSettingsTab(initialTab === 'curve' ? 'rules' : initialTab);
  if (fanSettingsModal) fanSettingsModal.classList.remove("hidden");
}

function switchSettingsTab(tab) {
  state.currentSettingsTab = tab;
  const tabButtons = {
    rules: tabBtnFanRules,
    channels: tabBtnFanChannels,
    sensors: tabBtnSensors,
    pdu: tabBtnPdu,
    nodes: tabBtnNodes,
  };
  const panels = {
    rules: panelFanRules,
    channels: panelFanChannels,
    sensors: panelSensors,
    pdu: panelPdu,
    nodes: panelNodes,
  };

  Object.entries(tabButtons).forEach(([key, btn]) => {
    if (!btn) return;
    if (key === tab) {
      btn.className = "px-3 py-2 font-semibold rounded-t-lg transition-colors border-b-2 border-cyan-500 text-cyan-400 bg-slate-800/60 whitespace-nowrap";
    } else {
      btn.className = "px-3 py-2 font-semibold rounded-t-lg transition-colors border-b-2 border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap";
    }
  });

  Object.entries(panels).forEach(([key, pnl]) => {
    if (!pnl) return;
    if (key === tab) {
      pnl.classList.remove("hidden");
    } else {
      pnl.classList.add("hidden");
    }
  });

  // Re-render corresponding panel content
  if (tab === 'rules') renderFanRulesList();
  if (tab === 'channels') renderFanSettingsChannelsList();
  if (tab === 'sensors') renderSettingsSensorsList();
  if (tab === 'pdu') renderSettingsPduList();
  if (tab === 'nodes') renderSettingsNodesList();
}

// Tab button event listeners
if (tabBtnFanRules) tabBtnFanRules.addEventListener("click", () => switchSettingsTab('rules'));
if (tabBtnFanChannels) tabBtnFanChannels.addEventListener("click", () => switchSettingsTab('channels'));
if (tabBtnSensors) tabBtnSensors.addEventListener("click", () => switchSettingsTab('sensors'));
if (tabBtnPdu) tabBtnPdu.addEventListener("click", () => switchSettingsTab('pdu'));
if (tabBtnNodes) tabBtnNodes.addEventListener("click", () => switchSettingsTab('nodes'));

// 7. Per-Fan Rules Management
function renderFanRulesList() {
  if (!fanRulesList) return;
  const rules = state.fanRules || [];

  if (rules.length === 0) {
    fanRulesList.innerHTML = `
      <div class="p-6 text-center text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
        No custom fan rules configured.<br>Click <strong class="text-cyan-400">+ Add Fan Rule</strong> to create individual thermal triggers for specific fans.
      </div>
    `;
    return;
  }

  // Pre-generate sensor options
  const sensorOptions = [
    { value: 'max_rack', label: 'Max Rack Temp' },
    { value: 'max_node', label: 'Max Node CPU Temp' },
    ...state.sensors.map(s => ({ value: s.id, label: `Sensor: ${s.alias}` }))
  ];

  // Pre-generate fan options
  const fanOptions = state.fans.map(f => ({
    value: f.channel,
    label: `CH ${f.channel} (${f.name})`
  }));

  fanRulesList.innerHTML = rules.map((r, idx) => {
    const sOptsHtml = sensorOptions.map(opt =>
      `<option value="${escapeHtml(opt.value)}" ${r.sensor_id === opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`
    ).join("");

    const fOptsHtml = fanOptions.map(opt =>
      `<option value="${opt.value}" ${parseInt(r.fan_channel, 10) === opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`
    ).join("");

    return `
      <div class="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-wrap items-center gap-2 text-xs">
        <span class="w-6 h-6 rounded-lg bg-slate-800 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
          ${idx + 1}
        </span>

        <span class="text-slate-400 text-[11px] font-medium">When</span>

        <!-- Sensor Selector -->
        <select onchange="updateFanRule(${idx}, 'sensor_id', this.value)" class="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500">
          ${sOptsHtml}
        </select>

        <span class="text-slate-400 text-[11px] font-medium">is</span>

        <!-- Condition Selector -->
        <select onchange="updateFanRule(${idx}, 'condition', this.value)" class="bg-slate-900 border border-slate-700 text-cyan-400 font-mono text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500">
          <option value="gte" ${r.condition === 'gte' ? 'selected' : ''}>&gt;=</option>
          <option value="lte" ${r.condition === 'lte' ? 'selected' : ''}>&lt;=</option>
          <option value="gt" ${r.condition === 'gt' ? 'selected' : ''}>&gt;</option>
          <option value="lt" ${r.condition === 'lt' ? 'selected' : ''}>&lt;</option>
          <option value="eq" ${r.condition === 'eq' ? 'selected' : ''}>==</option>
        </select>

        <!-- Temperature Threshold Input -->
        <div class="flex items-center space-x-1">
          <input
            type="number"
            step="0.5"
            value="${r.threshold_temp !== undefined ? r.threshold_temp : 40.0}"
            onchange="updateFanRule(${idx}, 'threshold_temp', parseFloat(this.value))"
            class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
          />
          <span class="text-slate-400 text-[11px]">°C</span>
        </div>

        <span class="text-slate-400 text-[11px] font-medium">&rarr; set</span>

        <!-- Target Fan Selector -->
        <select onchange="updateFanRule(${idx}, 'fan_channel', parseInt(this.value, 10))" class="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500">
          ${fOptsHtml}
        </select>

        <span class="text-slate-400 text-[11px] font-medium">to</span>

        <!-- Duty Percentage Input -->
        <div class="flex items-center space-x-1">
          <input
            type="number"
            min="0"
            max="100"
            value="${r.duty !== undefined ? r.duty : 70}"
            onchange="updateFanRule(${idx}, 'duty', parseInt(this.value, 10))"
            class="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
          />
          <span class="text-slate-400 text-[11px]">%</span>
        </div>

        <!-- Enabled Checkbox -->
        <label class="flex items-center space-x-1 cursor-pointer ml-auto mr-1">
          <input
            type="checkbox"
            ${r.enabled !== false ? 'checked' : ''}
            onchange="updateFanRule(${idx}, 'enabled', this.checked)"
            class="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
          />
          <span class="text-[10px] text-slate-400">Active</span>
        </label>

        <!-- Delete Rule Button -->
        <button type="button" onclick="deleteFanRule(${idx})" class="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors" title="Delete Rule">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    `;
  }).join("");
}

function addFanRule() {
  const defaultFan = state.fans[0] ? state.fans[0].channel : 1;
  state.fanRules.push({
    id: `rule_${Date.now()}_${state.fanRules.length}`,
    sensor_id: 'max_rack',
    condition: 'gte',
    threshold_temp: 40.0,
    fan_channel: defaultFan,
    duty: 70,
    enabled: true
  });
  renderFanRulesList();
}

if (btnAddFanRule) btnAddFanRule.addEventListener("click", addFanRule);

function updateFanRule(idx, field, value) {
  if (state.fanRules[idx]) {
    state.fanRules[idx][field] = value;
  }
}

function deleteFanRule(idx) {
  state.fanRules.splice(idx, 1);
  renderFanRulesList();
}

async function saveFanRules() {
  try {
    clearTimeout(occupancySyncTimer);
    lastOccupancySliderInteraction = 0;
    const homeMax = inputHomeMaxDuty ? parseInt(inputHomeMaxDuty.value, 10) : state.homeMaxDuty;
    const awayMax = inputAwayMaxDuty ? parseInt(inputAwayMaxDuty.value, 10) : state.awayMaxDuty;

    const resRules = await fetch("/api/config/fan-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules: state.fanRules })
    });

    const resOcc = await fetch("/api/config/occupancy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: state.occupancyMode,
        home_max_duty: homeMax,
        away_max_duty: awayMax,
      })
    });

    if (resRules.ok && resOcc.ok) {
      alert("Custom fan rules and occupancy speed limits successfully saved!");
      await fetchStatus();
    } else {
      alert("Failed to save fan rules or occupancy limits.");
    }
  } catch (err) {
    console.error("Failed to save fan rules:", err);
  }
}

if (btnSaveFanRules) btnSaveFanRules.addEventListener("click", saveFanRules);

// 9. Fan Channels Management
function renderFanSettingsChannelsList() {
  const list = state.fanSettingsList || [];
  if (!fanSettingsChannelsList) return;

  if (list.length === 0) {
    fanSettingsChannelsList.innerHTML = `
      <div class="p-4 text-center text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
        No fan channels configured.
      </div>
    `;
    return;
  }

  fanSettingsChannelsList.innerHTML = list.map((fan, idx) => {
    const pinType = fan.pin_type || '3-Pin';
    const pinBadgeClass = pinType.includes('4')
      ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
      : 'bg-amber-950 text-amber-300 border border-amber-800';

    return `
      <div class="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
        <div class="flex items-center space-x-2.5 min-w-0">
          <span class="w-6 h-6 rounded-lg bg-slate-800 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
            ${idx + 1}
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-200 shrink-0">CH ${fan.channel}</span>
              <span class="text-xs font-medium text-slate-300 truncate" title="${escapeHtml(fan.name)}">${escapeHtml(fan.name)}</span>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
              <span class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-medium">GPIO ${fan.gpio}</span>
              <span class="px-1.5 py-0.5 rounded ${pinBadgeClass}">${escapeHtml(pinType)}</span>
              <span class="text-slate-500">Min ${fan.min_duty}% • Default ${fan.default_duty}%</span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-1 shrink-0 ml-2">
          <button type="button" onclick="moveFanSettingsItem(${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-600"' : 'class="p-1 rounded text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors"'} title="Move Up">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
          </button>
          <button type="button" onclick="moveFanSettingsItem(${idx}, 1)" ${idx === list.length - 1 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-600"' : 'class="p-1 rounded text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors"'} title="Move Down">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button type="button" onclick="openFanModal(${fan.channel})" class="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors" title="Edit Fan">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button type="button" onclick="deleteFan(${fan.channel})" class="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors" title="Delete Fan">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function moveFanSettingsItem(idx, direction) {
  const list = state.fanSettingsList;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= list.length) return;
  const temp = list[idx];
  list[idx] = list[newIdx];
  list[newIdx] = temp;
  renderFanSettingsChannelsList();
}

async function saveFanOrder() {
  const list = state.fanSettingsList || [];
  if (list.length === 0) return;
  const order = list.map(f => parseInt(f.channel, 10));

  try {
    const res = await fetch("/api/config/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 'fans', order })
    });
    if (res.ok) {
      alert("Fan order saved successfully!");
      await fetchStatus();
    } else {
      const err = await res.json();
      alert(`Failed to save fan order: ${err.error || res.statusText}`);
    }
  } catch (err) {
    console.error("Failed to save fan order:", err);
  }
}

if (btnFanSettingsAdd) btnFanSettingsAdd.addEventListener("click", () => openFanModal(null));
if (btnSaveFanOrder) btnSaveFanOrder.addEventListener("click", saveFanOrder);

// 10. Sensors Management
function renderSettingsSensorsList() {
  if (!settingsSensorsList) return;
  const list = state.sensorsSettingsList || [];

  if (list.length === 0) {
    settingsSensorsList.innerHTML = `
      <div class="p-4 text-center text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
        No temperature sensors registered. Click '+ Add Sensor' to add a DS18B20 sensor.
      </div>
    `;
    return;
  }

  settingsSensorsList.innerHTML = list.map((s, idx) => {
    return `
      <div class="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
        <div class="flex items-center space-x-2.5 min-w-0">
          <span class="w-6 h-6 rounded-lg bg-slate-800 text-rose-400 font-bold text-xs flex items-center justify-center shrink-0">
            ${idx + 1}
          </span>
          <div class="min-w-0">
            <div class="text-xs font-semibold text-slate-200 truncate" title="${escapeHtml(s.alias)}">${escapeHtml(s.alias)}</div>
            <div class="text-[10px] text-slate-500 font-mono truncate">${escapeHtml(s.id)}</div>
          </div>
        </div>

        <div class="flex items-center space-x-1 shrink-0 ml-2">
          <button type="button" onclick="moveSensorSettingsItem(${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-600"' : 'class="p-1 rounded text-slate-300 hover:text-rose-400 hover:bg-slate-800 transition-colors"'} title="Move Up">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
          </button>
          <button type="button" onclick="moveSensorSettingsItem(${idx}, 1)" ${idx === list.length - 1 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-600"' : 'class="p-1 rounded text-slate-300 hover:text-rose-400 hover:bg-slate-800 transition-colors"'} title="Move Down">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button type="button" onclick="openSensorModal('${s.id}', '${escapeHtml(s.alias)}')" class="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors" title="Edit Sensor">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button type="button" onclick="deleteSensor('${s.id}')" class="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors" title="Delete Sensor">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function moveSensorSettingsItem(idx, direction) {
  const list = state.sensorsSettingsList;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= list.length) return;
  const temp = list[idx];
  list[idx] = list[newIdx];
  list[newIdx] = temp;
  renderSettingsSensorsList();
}

async function saveSensorsOrder() {
  const list = state.sensorsSettingsList || [];
  if (list.length === 0) return;
  const order = list.map(s => String(s.id));

  try {
    const res = await fetch("/api/config/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 'sensors', order })
    });
    if (res.ok) {
      alert("Sensor order saved successfully!");
      await fetchStatus();
    } else {
      const err = await res.json();
      alert(`Failed to save sensor order: ${err.error || res.statusText}`);
    }
  } catch (err) {
    console.error("Failed to save sensor order:", err);
  }
}

if (btnSettingsAddSensor) btnSettingsAddSensor.addEventListener("click", () => openSensorModal(null, ""));
if (btnSaveSensorsOrder) btnSaveSensorsOrder.addEventListener("click", saveSensorsOrder);

// 11. PDU Channels Management
function renderSettingsPduList() {
  if (!settingsPduList) return;
  const list = state.pduSettingsList || [];

  if (list.length === 0) {
    settingsPduList.innerHTML = `
      <div class="p-4 text-center text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
        No PDU channels configured. Click '+ Add PDU Channel' to add a shunt sensor channel.
      </div>
    `;
    return;
  }

  settingsPduList.innerHTML = list.map((ch, idx) => {
    const is5V = ch.rail === "5V";
    const railColorBadge = is5V
      ? "bg-cyan-950 text-cyan-400 border-cyan-800"
      : "bg-amber-950 text-amber-400 border-amber-800";

    return `
      <div class="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
        <div class="flex items-center space-x-2.5 min-w-0">
          <span class="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
            ${idx + 1}
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-slate-200 truncate" title="${escapeHtml(ch.name)}">${escapeHtml(ch.name)}</span>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${railColorBadge}">${ch.rail}</span>
            </div>
            <div class="text-[10px] text-slate-500 font-mono truncate">ID: ${escapeHtml(ch.id)} • INA226 (${escapeHtml(ch.i2c_addr || '0x40')})</div>
          </div>
        </div>

        <div class="flex items-center space-x-1 shrink-0 ml-2">
          <button type="button" onclick="movePduSettingsItem(${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-600"' : 'class="p-1 rounded text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors"'} title="Move Up">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
          </button>
          <button type="button" onclick="movePduSettingsItem(${idx}, 1)" ${idx === list.length - 1 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-600"' : 'class="p-1 rounded text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors"'} title="Move Down">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button type="button" onclick="openPduModal('${ch.id}')" class="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors" title="Edit PDU Channel">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button type="button" onclick="deletePduChannel('${ch.id}')" class="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors" title="Delete PDU Channel">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function movePduSettingsItem(idx, direction) {
  const list = state.pduSettingsList;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= list.length) return;
  const temp = list[idx];
  list[idx] = list[newIdx];
  list[newIdx] = temp;
  renderSettingsPduList();
}

async function savePduOrder() {
  const list = state.pduSettingsList || [];
  if (list.length === 0) return;
  const order = list.map(c => String(c.id));

  try {
    const res = await fetch("/api/config/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 'pdu_channels', order })
    });
    if (res.ok) {
      alert("PDU branch order saved successfully!");
      await fetchStatus();
    } else {
      const err = await res.json();
      alert(`Failed to save PDU order: ${err.error || res.statusText}`);
    }
  } catch (err) {
    console.error("Failed to save PDU order:", err);
  }
}

if (btnSettingsAddPdu) btnSettingsAddPdu.addEventListener("click", () => openPduModal(null));
if (btnSavePduOrder) btnSavePduOrder.addEventListener("click", savePduOrder);

// 12. Cluster Nodes Management & Deletion
function renderSettingsNodesList() {
  if (!settingsNodesList) return;
  const list = state.nodesSettingsList || [];

  if (list.length === 0) {
    settingsNodesList.innerHTML = `
      <div class="p-4 text-center text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
        No cluster nodes registered.
      </div>
    `;
    return;
  }

  settingsNodesList.innerHTML = list.map((node, idx) => {
    const isOnline = Boolean(node.online);
    return `
      <div class="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
        <div class="flex items-center space-x-2.5 min-w-0">
          <span class="w-6 h-6 rounded-lg bg-slate-800 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
            ${idx + 1}
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-200 truncate" title="${escapeHtml(node.node_id)}">${escapeHtml(node.node_id)}</span>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${isOnline ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-900 text-slate-500 border-slate-800'}">
                ${isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div class="text-[10px] text-slate-500 font-mono truncate">
              ${escapeHtml(node.os || 'OS Unknown')} • ${escapeHtml(node.ip_address || 'IP Unknown')}
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-1 shrink-0 ml-2">
          <button type="button" onclick="moveNodeSettingsItem(${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-600"' : 'class="p-1 rounded text-slate-300 hover:text-indigo-400 hover:bg-slate-800 transition-colors"'} title="Move Up">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
          </button>
          <button type="button" onclick="moveNodeSettingsItem(${idx}, 1)" ${idx === list.length - 1 ? 'disabled class="opacity-20 cursor-not-allowed p-1 text-slate-600"' : 'class="p-1 rounded text-slate-300 hover:text-indigo-400 hover:bg-slate-800 transition-colors"'} title="Move Down">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button type="button" onclick="deleteNodeFromSettings('${escapeHtml(node.node_id)}')" class="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors" title="Delete Node from Cluster">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function moveNodeSettingsItem(idx, direction) {
  const list = state.nodesSettingsList;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= list.length) return;
  const temp = list[idx];
  list[idx] = list[newIdx];
  list[newIdx] = temp;
  renderSettingsNodesList();
}

async function saveNodesOrder() {
  const list = state.nodesSettingsList || [];
  if (list.length === 0) return;
  const order = list.map(n => String(n.node_id));

  try {
    const res = await fetch("/api/config/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 'nodes', order })
    });
    if (res.ok) {
      alert("Cluster node order saved successfully!");
      await fetchStatus();
    } else {
      const err = await res.json();
      alert(`Failed to save node order: ${err.error || res.statusText}`);
    }
  } catch (err) {
    console.error("Failed to save node order:", err);
  }
}

if (btnSaveNodesOrder) btnSaveNodesOrder.addEventListener("click", saveNodesOrder);

async function deleteNodeFromSettings(nodeId) {
  if (!confirm(`Are you sure you want to remove cluster node '${nodeId}'?`)) return;

  try {
    const res = await fetch(`/api/config/node/${encodeURIComponent(nodeId)}`, {
      method: "DELETE"
    });
    if (res.ok) {
      state.nodesSettingsList = state.nodesSettingsList.filter(n => n.node_id !== nodeId);
      renderSettingsNodesList();
      await fetchStatus();
    } else {
      const err = await res.json();
      alert(`Failed to delete node: ${err.error || res.statusText}`);
    }
  } catch (err) {
    console.error("Failed to delete node:", err);
  }
}

// 13. Secondary Sensor Modal
function openSensorModal(sensorId = null, currentAlias = "") {
  state.editingSensor = sensorId;
  if (sensorId) {
    sensorModalTitle.textContent = "Edit Temperature Sensor";
    sensorIdInput.value = sensorId;
    sensorIdInput.readOnly = true;
    sensorIdInput.classList.add("opacity-60", "cursor-not-allowed");
    sensorAliasInput.value = currentAlias || sensorId;
  } else {
    sensorModalTitle.textContent = "Add Temperature Sensor";
    const nextNum = state.sensors.length + 1;
    sensorIdInput.value = `28-00000${nextNum}`;
    sensorIdInput.readOnly = false;
    sensorIdInput.classList.remove("opacity-60", "cursor-not-allowed");
    sensorAliasInput.value = "";
  }
  sensorModal.classList.remove("hidden");
  if (sensorId) {
    sensorAliasInput.focus();
  } else {
    sensorIdInput.focus();
  }
}

function closeSensorModal() {
  state.editingSensor = null;
  sensorModal.classList.add("hidden");
}

if (cancelSensorBtn) cancelSensorBtn.addEventListener("click", closeSensorModal);

if (sensorForm) {
  sensorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const sensorId = sensorIdInput.value.trim();
    const alias = sensorAliasInput.value.trim();
    if (!sensorId) return;

    try {
      const res = await fetch("/api/config/sensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensor_id: sensorId, alias })
      });
      if (res.ok) {
        closeSensorModal();
        await fetchStatus();
        state.sensorsSettingsList = [...(state.sensors || [])];
        renderSettingsSensorsList();
      } else {
        const err = await res.json();
        alert(`Sensor save failed: ${err.error || res.statusText}`);
      }
    } catch (err) {
      console.error("Failed to save sensor:", err);
    }
  });
}

async function deleteSensor(sensorId) {
  if (!confirm(`Are you sure you want to delete temperature sensor '${sensorId}'?`)) return;
  try {
    const res = await fetch(`/api/config/sensor/${encodeURIComponent(sensorId)}`, {
      method: "DELETE"
    });
    if (res.ok) {
      await fetchStatus();
      state.sensorsSettingsList = state.sensorsSettingsList.filter(s => s.id !== sensorId);
      renderSettingsSensorsList();
    }
  } catch (err) {
    console.error("Failed to delete sensor:", err);
  }
}

// 14. Secondary Fan Modal
function openFanModal(channelNum = null) {
  state.editingFan = channelNum;
  if (channelNum) {
    const fan = state.fans.find(f => f.channel === channelNum) || {};
    fanModalTitle.textContent = `Edit Fan Channel ${channelNum}`;
    fanChannelInput.value = channelNum;
    fanChannelInput.readOnly = true;
    fanChannelInput.classList.add("opacity-60", "cursor-not-allowed");
    fanNameInput.value = fan.name || "";
    fanGpioInput.value = fan.gpio !== undefined ? fan.gpio : 12;
    if (fanPinTypeInput) fanPinTypeInput.value = fan.pin_type || "3-Pin";
    fanMinDutyInput.value = fan.min_duty || 35;
    fanDefaultDutyInput.value = fan.default_duty || 50;
  } else {
    fanModalTitle.textContent = "Add Fan Channel";
    const maxCh = state.fans.length > 0 ? Math.max(...state.fans.map(f => f.channel)) : 0;
    fanChannelInput.value = maxCh + 1;
    fanChannelInput.readOnly = false;
    fanChannelInput.classList.remove("opacity-60", "cursor-not-allowed");
    fanNameInput.value = `Fan Channel ${maxCh + 1}`;
    fanGpioInput.value = 20;
    if (fanPinTypeInput) fanPinTypeInput.value = "3-Pin";
    fanMinDutyInput.value = 35;
    fanDefaultDutyInput.value = 50;
  }
  fanModal.classList.remove("hidden");
  if (channelNum) {
    fanNameInput.focus();
  } else {
    fanChannelInput.focus();
  }
}

function closeFanModal() {
  state.editingFan = null;
  fanModal.classList.add("hidden");
}

if (cancelFanBtn) cancelFanBtn.addEventListener("click", closeFanModal);

if (fanForm) {
  fanForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ch = parseInt(fanChannelInput.value, 10);
    const name = fanNameInput.value.trim();
    const gpio = parseInt(fanGpioInput.value, 10);
    const pinType = fanPinTypeInput ? fanPinTypeInput.value : "3-Pin";
    const minDuty = parseInt(fanMinDutyInput.value, 10);
    const defaultDuty = parseInt(fanDefaultDutyInput.value, 10);

    if (!ch) return;

    try {
      const res = await fetch("/api/config/fan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: ch,
          name,
          gpio,
          pin_type: pinType,
          min_duty: minDuty,
          default_duty: defaultDuty
        })
      });
      if (res.ok) {
        closeFanModal();
        await fetchStatus();
        state.fanSettingsList = [...(state.fans || [])];
        renderFanSettingsChannelsList();
      } else {
        const err = await res.json();
        alert(`Fan save failed: ${err.error || res.statusText}`);
      }
    } catch (err) {
      console.error("Failed to save fan:", err);
    }
  });
}

async function deleteFan(channel) {
  if (!confirm(`Are you sure you want to delete fan channel ${channel}?`)) return;
  try {
    const res = await fetch(`/api/config/fan/${channel}`, {
      method: "DELETE"
    });
    if (res.ok) {
      await fetchStatus();
      state.fanSettingsList = state.fanSettingsList.filter(f => f.channel !== channel);
      renderFanSettingsChannelsList();
    }
  } catch (err) {
    console.error("Failed to delete fan:", err);
  }
}

// 15. Secondary PDU Modal
function openPduModal(channelId = null) {
  state.editingPdu = channelId;
  const pduList = (state.pdu && state.pdu.channels) || [];
  if (channelId) {
    const ch = pduList.find(c => c.id === channelId) || {};
    pduModalTitle.textContent = `Edit PDU Branch (${channelId})`;
    pduIdInput.value = channelId;
    pduIdInput.readOnly = true;
    pduIdInput.classList.add("opacity-60", "cursor-not-allowed");
    pduNameInput.value = ch.name || "";
    pduRailSelect.value = ch.rail || "12V";
    pduI2cInput.value = ch.i2c_addr || "0x40";
    pduBaseAInput.value = ch.current || 0.8;
  } else {
    pduModalTitle.textContent = "Add PDU Branch Channel";
    pduIdInput.value = "";
    pduIdInput.readOnly = false;
    pduIdInput.classList.remove("opacity-60", "cursor-not-allowed");
    pduNameInput.value = "";
    pduRailSelect.value = "12V";
    const nextIdx = pduList.length;
    pduI2cInput.value = `0x${(0x40 + nextIdx).toString(16)}`;
    pduBaseAInput.value = "0.80";
  }
  pduModal.classList.remove("hidden");
  if (channelId) {
    pduNameInput.focus();
  } else {
    pduIdInput.focus();
  }
}

function closePduModal() {
  state.editingPdu = null;
  pduModal.classList.add("hidden");
}

if (cancelPduBtn) cancelPduBtn.addEventListener("click", closePduModal);

if (pduForm) {
  pduForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = pduIdInput.value.trim();
    const name = pduNameInput.value.trim();
    const rail = pduRailSelect.value;
    const i2cAddr = pduI2cInput.value.trim();
    const baseA = parseFloat(pduBaseAInput.value);

    if (!id) return;

    try {
      const res = await fetch("/api/config/pdu-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          rail,
          i2c_addr: i2cAddr,
          base_a: baseA
        })
      });
      if (res.ok) {
        closePduModal();
        await fetchStatus();
        state.pduSettingsList = [...((state.pdu && state.pdu.channels) || [])];
        renderSettingsPduList();
      } else {
        const err = await res.json();
        alert(`PDU channel save failed: ${err.error || res.statusText}`);
      }
    } catch (err) {
      console.error("Failed to save PDU channel:", err);
    }
  });
}

async function deletePduChannel(channelId) {
  if (!confirm(`Are you sure you want to delete PDU branch channel '${channelId}'?`)) return;
  try {
    const res = await fetch(`/api/config/pdu-channel/${encodeURIComponent(channelId)}`, {
      method: "DELETE"
    });
    if (res.ok) {
      await fetchStatus();
      state.pduSettingsList = state.pduSettingsList.filter(c => c.id !== channelId);
      renderSettingsPduList();
    }
  } catch (err) {
    console.error("Failed to delete PDU channel:", err);
  }
}

// 16. Secondary PMIC Telemetry Modal
function openPmicModal(nodeId) {
  const node = state.nodes[nodeId];
  if (!node || !node.pmic) return;
  const pmic = node.pmic;

  if (pmicModalTitle) pmicModalTitle.textContent = `${node.node_id} PMIC Details`;
  if (pmicModalSubtitle) pmicModalSubtitle.textContent = `${pmic.type} • ${node.hostname || node.node_id} (${node.ip_address || ''})`;

  let boxHtml = '';
  if (pmic.input_voltage) {
    boxHtml += `
      <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
        <span class="text-[10px] text-slate-400 block">Main Input Voltage</span>
        <span class="text-sm font-bold text-cyan-400 font-mono">${pmic.input_voltage.toFixed(2)} V</span>
      </div>
    `;
  }
  if (pmic.core_voltage) {
    boxHtml += `
      <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
        <span class="text-[10px] text-slate-400 block">CPU Core Voltage</span>
        <span class="text-sm font-bold text-emerald-400 font-mono">${pmic.core_voltage.toFixed(2)} V</span>
      </div>
    `;
  }
  if (pmic.power_w) {
    boxHtml += `
      <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
        <span class="text-[10px] text-slate-400 block">Internal Power</span>
        <span class="text-sm font-bold text-amber-400 font-mono">${pmic.power_w.toFixed(1)} W</span>
      </div>
    `;
  }
  if (!boxHtml) {
    boxHtml = `
      <div class="col-span-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono">
        ${escapeHtml(pmic.summary || pmic.type)}
      </div>
    `;
  }
  if (pmicModalSummaryBox) pmicModalSummaryBox.innerHTML = boxHtml;

  const rails = pmic.rails || {};
  const entries = Object.entries(rails);
  if (pmicRailsCount) pmicRailsCount.textContent = `${entries.length} Rails`;

  if (pmicRailsList) {
    if (entries.length === 0) {
      pmicRailsList.innerHTML = `
        <div class="p-4 text-center text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
          No detailed rail metrics available.
        </div>
      `;
    } else {
      pmicRailsList.innerHTML = entries.map(([name, r]) => {
        let valText = '';
        if (r.voltage !== null && r.voltage !== undefined) {
          valText += `<span class="text-cyan-300 font-mono">${r.voltage.toFixed(3)}V</span>`;
        }
        if (r.current !== null && r.current !== undefined) {
          valText += `<span class="text-emerald-400 font-mono ml-2">${r.current.toFixed(3)}A</span>`;
        }
        if (r.power_w !== null && r.power_w !== undefined && r.power_w > 0) {
          valText += `<span class="text-amber-300 font-mono font-bold ml-2">${r.power_w.toFixed(2)}W</span>`;
        }
        return `
          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 text-xs">
            <span class="font-mono text-slate-300 font-medium truncate pr-2">${escapeHtml(name)}</span>
            <div class="shrink-0 flex items-center">
              ${valText || '<span class="text-slate-500 font-mono">N/A</span>'}
            </div>
          </div>
        `;
      }).join("");
    }
  }

  if (pmicModal) pmicModal.classList.remove("hidden");
}

function closePmicModal() {
  if (pmicModal) pmicModal.classList.add("hidden");
}

if (closePmicBtn) closePmicBtn.addEventListener("click", closePmicModal);
if (btnPmicClose) btnPmicClose.addEventListener("click", closePmicModal);

// Global window bindings for inline HTML handlers
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.openSettingsProtected = openSettingsProtected;
window.switchSettingsTab = switchSettingsTab;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.handleLogout = handleLogout;

window.onSliderInput = onSliderInput;
window.onSliderChange = onSliderChange;
window.setQuickDuty = setQuickDuty;
window.setFanMode = setFanMode;
window.setOccupancyMode = setOccupancyMode;
window.syncOccupancyLimits = syncOccupancyLimits;

window.renderFanRulesList = renderFanRulesList;
window.addFanRule = addFanRule;
window.updateFanRule = updateFanRule;
window.deleteFanRule = deleteFanRule;
window.saveFanRules = saveFanRules;

window.renderFanSettingsChannelsList = renderFanSettingsChannelsList;
window.moveFanSettingsItem = moveFanSettingsItem;
window.saveFanOrder = saveFanOrder;
window.openFanModal = openFanModal;
window.deleteFan = deleteFan;

window.renderSettingsSensorsList = renderSettingsSensorsList;
window.moveSensorSettingsItem = moveSensorSettingsItem;
window.saveSensorsOrder = saveSensorsOrder;
window.openSensorModal = openSensorModal;
window.deleteSensor = deleteSensor;

window.renderSettingsPduList = renderSettingsPduList;
window.movePduSettingsItem = movePduSettingsItem;
window.savePduOrder = savePduOrder;
window.openPduModal = openPduModal;
window.deletePduChannel = deletePduChannel;

window.renderSettingsNodesList = renderSettingsNodesList;
window.moveNodeSettingsItem = moveNodeSettingsItem;
window.saveNodesOrder = saveNodesOrder;
window.deleteNodeFromSettings = deleteNodeFromSettings;

window.openPmicModal = openPmicModal;
window.closePmicModal = closePmicModal;

// Application Initialization
function startDashboard() {
  fetchStatus();
  if (!state.pollTimer) {
    state.pollTimer = setInterval(fetchStatus, 2000);
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDashboard);
} else {
  startDashboard();
}
