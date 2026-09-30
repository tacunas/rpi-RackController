import os
import tempfile
import pytest
from unittest.mock import patch, MagicMock

from agent.agent import MonitoringAgent, detect_os, get_cpu_temp, get_linux_cpu_temp


def test_detect_os():
    os_name = detect_os()
    assert isinstance(os_name, str)
    assert len(os_name) > 0


def test_agent_config_and_collection(tmp_path):
    conf_file = tmp_path / "test_agent_config.json"
    conf_data = {
        "server_url": "http://127.0.0.1:8000",
        "node_id": "test-node",
        "interval_seconds": 1,
        "timeout_seconds": 2,
    }
    with open(conf_file, "w") as f:
        import json
        json.dump(conf_data, f)

    agent = MonitoringAgent(config_file=str(conf_file))
    assert agent.node_id == "test-node"
    assert agent.interval == 1

    metrics = agent.collect_metrics()
    assert metrics["node_id"] == "test-node"
    assert "cpu_temp" in metrics
    assert "cpu_usage" in metrics
    assert "mem_usage" in metrics
    assert "disk_usage" in metrics
    assert "uptime" in metrics
    assert metrics["uptime"] > 0


def test_agent_network_failure_resilience(tmp_path):
    conf_file = tmp_path / "test_resilient_agent.json"
    agent = MonitoringAgent(config_file=str(conf_file))

    # Mock requests.post to simulate connection error
    with patch("requests.post", side_effect=Exception("Connection refused")):
        # Ensure collect_metrics still succeeds
        metrics = agent.collect_metrics()
        assert metrics["node_id"] == agent.node_id
