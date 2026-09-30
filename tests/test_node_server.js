const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTests() {
  const testConfigPath = path.resolve(__dirname, 'test_config.json');
  const baseConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config.json'), 'utf8'));
  baseConfig.fan_control = baseConfig.fan_control || {};
  baseConfig.fan_control.auto_mode = true;
  fs.writeFileSync(testConfigPath, JSON.stringify(baseConfig, null, 2), 'utf8');

  process.env.RACK_CONFIG = testConfigPath;
  process.env.PORT = '8088';
  console.log('[Test 1/6] Initializing Node.js RackController & Express server on port 8088...');
  const { app, controller, server } = require('../server/server');

  if (!server.listening) {
    await new Promise(resolve => server.once('listening', resolve));
  }

  const address = server.address();
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    console.log('[Test 2/6] Verifying GET / index.html and GET /api/status...');
    const indexRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(indexRes.status, 200);
    const htmlText = await indexRes.text();
    assert(htmlText.includes('Rack-Status Dashboard'), 'HTML title missing');

    const statusRes = await fetch(`${baseUrl}/api/status`);
    assert.strictEqual(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.strictEqual(statusData.fans.length, 4, 'Should have 4 fan channels');
    assert.strictEqual(statusData.auto_mode, true, 'Default auto_mode should be true');
    assert(statusData.pdu, 'PDU data should be present in status');
    assert(statusData.pdu.total_watts > 0, 'Total watts should be > 0');
    assert(statusData.pdu.rails.rail_5v, '5V rail should be present');
    assert(statusData.pdu.rails.rail_12v, '12V rail should be present');
    assert.strictEqual(statusData.pdu.channels.length, Object.keys(controller.config.pdu.channels).length, 'Should have matching PDU device channels');
    console.log(` -> PDU Telemetry verified: ${statusData.pdu.total_watts}W, ${statusData.pdu.channels.length} channels`);

    console.log('[Test 3/6] Simulating metrics from 6 cluster nodes...');
    const nodes = [
      { node_id: 'win11-workstation', os: 'Windows 11', cpu_temp: 55.4, cpu_usage: 25.1, mem_usage: 45.0, disk_usage: 60.0, load_avg: [], uptime: 100000, ip_address: '192.168.1.10' },
      { node_id: 'pve-node-01', os: 'Proxmox VE 8.1', cpu_temp: 68.2, cpu_usage: 62.0, mem_usage: 78.0, disk_usage: 50.0, load_avg: [2.1, 1.8, 1.5], uptime: 900000, ip_address: '192.168.1.11' },
      { node_id: 'orangepi-5-plus', os: 'Armbian 24.2', cpu_temp: 49.0, cpu_usage: 12.0, mem_usage: 20.0, disk_usage: 15.0, load_avg: [0.3, 0.4, 0.3], uptime: 400000, ip_address: '192.168.1.12' },
      { node_id: 'orangepi-zero3', os: 'Armbian 24.2', cpu_temp: 51.5, cpu_usage: 18.0, mem_usage: 32.0, disk_usage: 22.0, load_avg: [0.5, 0.4, 0.4], uptime: 300000, ip_address: '192.168.1.13' },
      { node_id: 'rpi4-node-01', os: 'Raspberry Pi OS 12', cpu_temp: 57.0, cpu_usage: 38.0, mem_usage: 55.0, disk_usage: 38.0, load_avg: [0.9, 0.8, 0.7], uptime: 700000, ip_address: '192.168.1.14' },
      { node_id: 'rpi5-controller', os: 'Raspberry Pi OS 13', cpu_temp: 69.5, cpu_usage: 30.0, mem_usage: 28.0, disk_usage: 27.0, load_avg: [1.2, 0.9, 0.8], uptime: 58000, ip_address: '192.168.1.15' },
    ];

    for (const node of nodes) {
      const res = await fetch(`${baseUrl}/api/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node),
      });
      assert.strictEqual(res.status, 200);
      const resData = await res.json();
      assert.strictEqual(resData.status, 'ok');
    }

    const updatedStatusRes = await fetch(`${baseUrl}/api/status`);
    const updatedStatus = await updatedStatusRes.json();
    assert.strictEqual(updatedStatus.online_nodes_count, 6, 'All 6 nodes should be online');
    assert.strictEqual(updatedStatus.max_node_temp, 69.5, 'Max node temp should match');
    console.log(` -> 6 Nodes online! Auto calculated target fan duty: ${updatedStatus.target_fan_duty}%`);

    console.log('[Test 4/6] Testing manual fan control for 3-pin fans (POST /api/fans)...');
    const fanReq = {
      auto_mode: false,
      manual_duties: { '1': 45, '2': 60, '3': 75, '4': 90 },
    };
    const fanRes = await fetch(`${baseUrl}/api/fans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fanReq),
    });
    assert.strictEqual(fanRes.status, 200);

    const manualStatus = await (await fetch(`${baseUrl}/api/status`)).json();
    assert.strictEqual(manualStatus.auto_mode, false);
    const fanMap = {};
    manualStatus.fans.forEach(f => { fanMap[f.channel] = f.duty_cycle; });
    assert.strictEqual(fanMap[1], 45);
    assert.strictEqual(fanMap[2], 60);
    assert.strictEqual(fanMap[3], 75);
    assert.strictEqual(fanMap[4], 90);
    console.log(' -> Manual 3-pin fan duties verified:', fanMap);

    console.log('[Test 5/6] Testing sensor alias & fan curve endpoints...');
    const aliasRes = await fetch(`${baseUrl}/api/config/sensor-alias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensor_id: '28-000001', alias: '서버랙 배기 팬 덕트' }),
    });
    assert.strictEqual(aliasRes.status, 200);

    const curveRes = await fetch(`${baseUrl}/api/config/curve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rack_temp_min: 31,
        rack_temp_max: 51,
        node_temp_min: 46,
        node_temp_max: 81,
        min_fan_duty: 32,
        max_fan_duty: 98,
      }),
    });
    assert.strictEqual(curveRes.status, 200);

    // Switch back to auto mode
    await fetch(`${baseUrl}/api/fans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_mode: true }),
    });

    console.log('[Test 6/7] Testing Sensor, Fan, and PDU CRUD endpoints...');
    // Fan CRUD test
    const addFanRes = await fetch(`${baseUrl}/api/config/fan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 5, name: '보조팬', gpio: 21, pin_type: '4-Pin', min_duty: 30, default_duty: 40 }),
    });
    assert.strictEqual(addFanRes.status, 200);
    const addFanData = await addFanRes.json();
    assert.strictEqual(addFanData.fan.pin_type, '4-Pin');

    const delFanRes = await fetch(`${baseUrl}/api/config/fan/5`, { method: 'DELETE' });
    assert.strictEqual(delFanRes.status, 200);

    // Sensor CRUD test
    const addSensRes = await fetch(`${baseUrl}/api/config/sensor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensor_id: '28-test99', alias: '테스트 센서' }),
    });
    assert.strictEqual(addSensRes.status, 200);

    const delSensRes = await fetch(`${baseUrl}/api/config/sensor/28-test99`, { method: 'DELETE' });
    assert.strictEqual(delSensRes.status, 200);

    // PDU Branch CRUD test
    const addPduRes = await fetch(`${baseUrl}/api/config/pdu-channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '12V_test', name: '테스트 분기', rail: '12V', i2c_addr: '0x49', base_a: 0.5 }),
    });
    assert.strictEqual(addPduRes.status, 200);

    const delPduRes = await fetch(`${baseUrl}/api/config/pdu-channel/12V_test`, { method: 'DELETE' });
    assert.strictEqual(delPduRes.status, 200);
    console.log(' -> Sensor, Fan, and PDU CRUD operations verified successfully!');

    console.log('[Test 7/8] Testing Display Order API (POST /api/config/order)...');
    // Test fan reordering
    const fanOrderRes = await fetch(`${baseUrl}/api/config/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'fans', order: [4, 3, 2, 1] }),
    });
    assert.strictEqual(fanOrderRes.status, 200);
    const fanOrderData = await fanOrderRes.json();
    assert.deepStrictEqual(fanOrderData.order, [4, 3, 2, 1]);

    // Test sensor reordering
    const sensorOrderRes = await fetch(`${baseUrl}/api/config/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sensors', order: ['28-000003', '28-000001', '28-000002'] }),
    });
    assert.strictEqual(sensorOrderRes.status, 200);

    // Verify via GET /api/status that the return order matches!
    const reorderedStatus = await (await fetch(`${baseUrl}/api/status`)).json();
    assert.strictEqual(reorderedStatus.fans[0].channel, 4);
    assert.strictEqual(reorderedStatus.fans[1].channel, 3);
    assert.strictEqual(reorderedStatus.sensors[0].id, '28-000003');
    assert.strictEqual(reorderedStatus.sensors[1].id, '28-000001');
    assert(Array.isArray(reorderedStatus.node_list), 'node_list should be an array');
    console.log(' -> Display order successfully saved, persisted, and reflected in /api/status!');

    // Reset fan order back
    await fetch(`${baseUrl}/api/config/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'fans', order: [1, 2, 3, 4] }),
    });

    console.log('[Test 8/9] Testing Admin Login, Node Deletion & Custom Per-Fan Rules...');
    // Admin login with valid credentials
    const loginOkRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'jackson', password: 'Conti197619!' }),
    });
    assert.strictEqual(loginOkRes.status, 200);
    const loginOkData = await loginOkRes.json();
    assert.strictEqual(loginOkData.success, true);
    assert(loginOkData.token, 'Token should be present');

    // Admin login with invalid credentials
    const loginFailRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'jackson', password: 'wrongpassword' }),
    });
    assert.strictEqual(loginFailRes.status, 401);

    // Delete Node endpoint
    const deleteNodeRes = await fetch(`${baseUrl}/api/config/node/win11-workstation`, {
      method: 'DELETE',
    });
    assert.strictEqual(deleteNodeRes.status, 200);
    const deleteNodeData = await deleteNodeRes.json();
    assert.strictEqual(deleteNodeData.status, 'ok');

    const statusAfterNodeDel = await (await fetch(`${baseUrl}/api/status`)).json();
    assert.strictEqual(statusAfterNodeDel.nodes['win11-workstation'], undefined, 'Node should be removed');
    assert(!statusAfterNodeDel.display_order.nodes.includes('win11-workstation'), 'Node should be removed from order');

    // Custom Fan Rules endpoint
    const testRules = [
      {
        id: 'rule_1',
        sensor_id: 'max_rack',
        condition: 'gte',
        threshold_temp: 45.0,
        fan_channel: 1,
        duty: 85,
        enabled: true,
      },
      {
        id: 'rule_2',
        sensor_id: 'max_node',
        condition: 'gte',
        threshold_temp: 60.0,
        fan_channel: 2,
        duty: 95,
        enabled: true,
      }
    ];

    const saveRulesRes = await fetch(`${baseUrl}/api/config/fan-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: testRules }),
    });
    assert.strictEqual(saveRulesRes.status, 200);
    const savedRulesData = await saveRulesRes.json();
    assert.strictEqual(savedRulesData.rules.length, 2);

    const getRulesRes = await fetch(`${baseUrl}/api/config/fan-rules`);
    assert.strictEqual(getRulesRes.status, 200);
    const getRulesData = await getRulesRes.json();
    assert.strictEqual(getRulesData.rules.length, 2);
    assert.strictEqual(getRulesData.rules[0].duty, 85);

    // Occupancy Mode (Home / Away) & Max Speed Limits endpoint
    const occRes = await fetch(`${baseUrl}/api/config/occupancy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'home', home_max_duty: 45, away_max_duty: 90 }),
    });
    assert.strictEqual(occRes.status, 200);
    const occData = await occRes.json();
    assert.strictEqual(occData.occupancy_mode, 'home');
    assert.strictEqual(occData.home_max_duty, 45);
    assert.strictEqual(occData.away_max_duty, 90);

    // Verify in GET /api/status
    const statusWithOcc = await (await fetch(`${baseUrl}/api/status`)).json();
    assert.strictEqual(statusWithOcc.occupancy_mode, 'home');
    assert.strictEqual(statusWithOcc.home_max_duty, 45);
    assert.strictEqual(statusWithOcc.away_max_duty, 90);

    // Trigger step to verify speed cap is applied under home mode (rule requested 85%, capped at 45%)
    await controller.step();
    const duties = controller.hardware.getAllChannelDuties();
    assert(duties[1] <= 45, `Fan channel 1 duty ${duties[1]} should be capped by home_max_duty 45%`);
    console.log(` -> Occupancy Mode verified: Home Mode max duty ${statusWithOcc.home_max_duty}% successfully capped fan speed to ${duties[1]}%!`);

    console.log('[Test 9/9] All Node.js integration tests passed successfully!');
    process.exit(0);
  } finally {
    controller.stop();
    server.close();
    try {
      if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
    } catch (_) {}
  }
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
