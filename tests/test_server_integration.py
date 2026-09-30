import copy
import json
import os
import time
import pytest
from fastapi.testclient import TestClient

from server.main import app
import server.main as main_module
from server.controller import RackController


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    # Setup temporary config for tests
    tmp_dir = tmp_path_factory.mktemp("config")
    test_config_path = os.path.join(tmp_dir, "test_config.json")

    with open("config.json", "r", encoding="utf-8") as f:
        base_cfg = json.load(f)

    with open(test_config_path, "w", encoding="utf-8") as f:
        json.dump(base_cfg, f)

    os.environ["RACK_CONFIG"] = str(test_config_path)

    with TestClient(app) as test_client:
        yield test_client

    if "RACK_CONFIG" in os.environ:
        del os.environ["RACK_CONFIG"]


def test_index_page(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "홈 서버랙 통합 컨트롤러" in response.text
    assert "app.js" in response.text


def test_get_initial_status(client):
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "sensors" in data
    assert "fans" in data
    assert len(data["fans"]) == 4
    assert data["auto_mode"] is True


def test_report_cluster_metrics(client):
    nodes_to_report = [
        {
            "node_id": "win11-workstation",
            "os": "Windows 11",
            "cpu_temp": 52.3,
            "cpu_usage": 34.2,
            "mem_usage": 48.0,
            "disk_usage": 65.1,
            "load_avg": [],
            "uptime": 86400,
            "ip_address": "192.168.1.10",
            "hostname": "WIN-MAIN",
        },
        {
            "node_id": "pve-node-01",
            "os": "Proxmox VE 8.1",
            "cpu_temp": 64.8,
            "cpu_usage": 72.1,
            "mem_usage": 82.5,
            "disk_usage": 54.0,
            "load_avg": [2.45, 2.10, 1.88],
            "uptime": 1200000,
            "ip_address": "192.168.1.11",
            "hostname": "pve-01",
        },
        {
            "node_id": "orangepi-5-plus",
            "os": "Armbian 24.2",
            "cpu_temp": 48.5,
            "cpu_usage": 15.0,
            "mem_usage": 22.0,
            "disk_usage": 18.5,
            "load_avg": [0.35, 0.40, 0.38],
            "uptime": 350000,
            "ip_address": "192.168.1.12",
            "hostname": "opi5",
        },
        {
            "node_id": "orangepi-zero3",
            "os": "Armbian 24.2",
            "cpu_temp": 50.1,
            "cpu_usage": 20.4,
            "mem_usage": 35.1,
            "disk_usage": 29.0,
            "load_avg": [0.60, 0.55, 0.50],
            "uptime": 500000,
            "ip_address": "192.168.1.13",
            "hostname": "opiz3",
        },
        {
            "node_id": "rpi4-k3s-agent",
            "os": "Raspberry Pi OS 12",
            "cpu_temp": 58.2,
            "cpu_usage": 45.3,
            "mem_usage": 60.2,
            "disk_usage": 42.1,
            "load_avg": [1.10, 1.05, 0.95],
            "uptime": 800000,
            "ip_address": "192.168.1.14",
            "hostname": "rpi4-k3s",
        },
        {
            "node_id": "rpi5-controller",
            "os": "Raspberry Pi OS 13",
            "cpu_temp": 66.5,
            "cpu_usage": 28.0,
            "mem_usage": 25.0,
            "disk_usage": 30.0,
            "load_avg": [0.85, 0.70, 0.60],
            "uptime": 60000,
            "ip_address": "192.168.1.15",
            "hostname": "rpi5",
        },
    ]

    for node in nodes_to_report:
        res = client.post("/api/metrics", json=node)
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

    # Verify status reflects 6 online nodes
    status_res = client.get("/api/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["online_nodes_count"] == 6
    assert status_data["total_nodes_count"] == 6
    assert "win11-workstation" in status_data["nodes"]
    assert status_data["nodes"]["win11-workstation"]["online"] is True
    assert status_data["max_node_temp"] == 66.5


def test_fan_manual_control(client):
    # Set to manual mode with custom duties
    payload = {
        "auto_mode": False,
        "manual_duties": {
            "1": 40,
            "2": 65,
            "3": 75,
            "4": 90,
        },
    }
    res = client.post("/api/fans", json=payload)
    assert res.status_code == 200
    assert res.json()["auto_mode"] is False

    # Check status
    status_res = client.get("/api/status")
    status = status_res.json()
    assert status["auto_mode"] is False
    fan_map = {f["channel"]: f["duty_cycle"] for f in status["fans"]}
    assert fan_map[1] == 40
    assert fan_map[2] == 65
    assert fan_map[3] == 75
    assert fan_map[4] == 90


def test_sensor_alias_update(client):
    res = client.post(
        "/api/config/sensor-alias",
        json={"sensor_id": "28-000001", "alias": "랙 최상단 배기구"},
    )
    assert res.status_code == 200
    assert res.json()["alias"] == "랙 최상단 배기구"

    cfg_res = client.get("/api/config")
    cfg = cfg_res.json()
    assert cfg["sensor_aliases"]["28-000001"] == "랙 최상단 배기구"


def test_fan_curve_update(client):
    curve_payload = {
        "rack_temp_min": 32.0,
        "rack_temp_max": 52.0,
        "node_temp_min": 48.0,
        "node_temp_max": 82.0,
        "min_fan_duty": 35,
        "max_fan_duty": 95,
    }
    res = client.post("/api/config/curve", json=curve_payload)
    assert res.status_code == 200
    assert res.json()["curve"]["min_fan_duty"] == 35


def test_node_timeout_behavior(client):
    # Artificially age a node beyond timeout
    controller = main_module.controller
    if "win11-workstation" in controller.nodes:
        controller.nodes["win11-workstation"].last_seen = time.time() - 25.0

    status_res = client.get("/api/status")
    data = status_res.json()
    assert data["nodes"]["win11-workstation"]["online"] is False
    assert data["online_nodes_count"] == 5
