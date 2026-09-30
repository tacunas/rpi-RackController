#!/usr/bin/env python3
"""Cross-platform hardware monitoring agent for cluster nodes.

Supports Linux (Debian, Ubuntu, Proxmox VE, Armbian, Raspberry Pi OS)
and Windows.
"""

import json
import logging
import os
import platform
import socket
import sys
import time
from typing import List, Optional

import psutil
import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("rack.agent")


def detect_os() -> str:
    """Detect operating system with detailed distribution name."""
    system = platform.system()
    if system == "Windows":
        return f"Windows {platform.release()}"
    elif system == "Darwin":
        return f"macOS {platform.mac_ver()[0]}"
    elif system == "Linux":
        # Check /etc/os-release for Linux distros
        if os.path.exists("/etc/os-release"):
            try:
                with open("/etc/os-release", "r") as f:
                    data = {}
                    for line in f:
                        if "=" in line:
                            k, v = line.strip().split("=", 1)
                            data[k] = v.strip('"')

                name = data.get("PRETTY_NAME") or data.get("NAME")
                if "Proxmox" in str(name) or os.path.exists("/etc/pve"):
                    return f"Proxmox VE ({data.get('VERSION_ID', '')})".strip()
                if "Armbian" in str(name):
                    return f"Armbian ({data.get('VERSION_CODENAME', '')})".strip()
                if "Raspbian" in str(name) or "Raspberry" in str(name):
                    return f"Raspberry Pi OS ({data.get('VERSION_CODENAME', '')})".strip()
                if name:
                    return name
            except Exception:
                pass
        return "Linux"
    return system


def get_local_ip() -> str:
    """Get the node's primary outbound IP address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not actually establish connection; selects default route interface
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def get_linux_cpu_temp() -> float:
    """Read CPU temperature on Linux systems."""
    # 1. Try psutil sensors_temperatures
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            # Common sensor keys in order of priority
            preferred_keys = [
                "cpu_thermal",
                "coretemp",
                "k10temp",
                "soc_thermal",
                "cpu-thermal",
                "zenpower",
                "acpitz",
            ]
            for key in preferred_keys:
                if key in temps and temps[key]:
                    entries = temps[key]
                    # Filter for entries that have a valid positive current temp
                    valid = [e.current for e in entries if e.current and e.current > 0]
                    if valid:
                        return round(max(valid), 1)

            # Any first valid temperature sensor
            for key, entries in temps.items():
                valid = [e.current for e in entries if e.current and e.current > 0]
                if valid:
                    return round(max(valid), 1)
    except Exception as e:
        logger.debug(f"psutil temperature read failed: {e}")

    # 2. Direct thermal_zone reading
    thermal_paths = [
        "/sys/class/thermal/thermal_zone0/temp",
        "/sys/class/hwmon/hwmon0/temp1_input",
        "/sys/devices/virtual/thermal/thermal_zone0/temp",
    ]
    for path in thermal_paths:
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    val = float(f.read().strip())
                    if val > 1000:
                        val = val / 1000.0
                    if 0 < val < 130:
                        return round(val, 1)
            except Exception:
                pass

    return 0.0


def get_windows_cpu_temp() -> float:
    """Read CPU temperature on Windows via WMI LibreHardwareMonitor / OpenHardwareMonitor."""
    try:
        import wmi  # type: ignore

        w = wmi.WMI(namespace=r"root\LibreHardwareMonitor")
        sensors = w.Sensor()
        cpu_temps = [
            float(s.Value)
            for s in sensors
            if s.SensorType == "Temperature" and "cpu" in s.Name.lower() and s.Value
        ]
        if cpu_temps:
            return round(max(cpu_temps), 1)
    except Exception:
        pass

    try:
        import wmi  # type: ignore

        w = wmi.WMI(namespace=r"root\OpenHardwareMonitor")
        sensors = w.Sensor()
        cpu_temps = [
            float(s.Value)
            for s in sensors
            if s.SensorType == "Temperature" and "cpu" in s.Name.lower() and s.Value
        ]
        if cpu_temps:
            return round(max(cpu_temps), 1)
    except Exception:
        pass

    return 0.0


def get_cpu_temp() -> float:
    """Cross-platform CPU temperature reading."""
    if sys.platform.startswith("linux"):
        return get_linux_cpu_temp()
    elif sys.platform == "win32":
        return get_windows_cpu_temp()
    return 0.0


class MonitoringAgent:
    """Agent running on target nodes periodically posting telemetry to the main controller."""

    def __init__(self, config_file: str = "agent_config.json"):
        self.config_file = config_file
        self.config = self._load_config()

        self.server_url = self.config.get("server_url", "http://127.0.0.1:8000").rstrip("/")
        self.node_id = self.config.get("node_id", socket.gethostname())
        self.interval = self.config.get("interval_seconds", 3)
        self.timeout = self.config.get("timeout_seconds", 5)

        self.os_name = detect_os()
        self.hostname = socket.gethostname()
        self.ip_address = get_local_ip()

        # Prime CPU percent measurement
        psutil.cpu_percent(interval=None)

    def _load_config(self) -> dict:
        """Load configuration or create default if not present."""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to parse {self.config_file}: {e}")

        # Default configuration
        default_config = {
            "server_url": "http://127.0.0.1:8000",
            "node_id": socket.gethostname(),
            "interval_seconds": 3,
            "timeout_seconds": 5,
        }
        try:
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(default_config, f, indent=2)
        except Exception:
            pass

        return default_config

    def collect_metrics(self) -> dict:
        """Collect current system metrics."""
        cpu_usage = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()

        # Disk usage: root partition or system drive
        disk_path = "C:\\" if sys.platform == "win32" else "/"
        try:
            disk = psutil.disk_usage(disk_path)
            disk_usage = disk.percent
        except Exception:
            disk_usage = 0.0

        # Load averages
        load_avg: List[float] = []
        if hasattr(os, "getloadavg"):
            try:
                load_avg = [round(x, 2) for x in os.getloadavg()]
            except Exception:
                load_avg = []

        uptime = int(time.time() - psutil.boot_time())
        cpu_temp = get_cpu_temp()

        return {
            "node_id": self.node_id,
            "os": self.os_name,
            "cpu_temp": cpu_temp,
            "cpu_usage": round(cpu_usage, 1),
            "mem_usage": round(mem.percent, 1),
            "disk_usage": round(disk_usage, 1),
            "load_avg": load_avg,
            "uptime": uptime,
            "ip_address": self.ip_address,
            "hostname": self.hostname,
            "timestamp": time.time(),
        }

    def run(self):
        """Main agent loop."""
        logger.info(
            f"Monitoring Agent started. Node ID: '{self.node_id}', Server: '{self.server_url}', Interval: {self.interval}s"
        )
        api_endpoint = f"{self.server_url}/api/metrics"

        while True:
            try:
                metrics = self.collect_metrics()
                resp = requests.post(api_endpoint, json=metrics, timeout=self.timeout)
                if resp.status_code == 200:
                    logger.debug(f"Metrics transmitted successfully: CPU {metrics['cpu_usage']}%, Temp {metrics['cpu_temp']}°C")
                else:
                    logger.warning(f"Server responded with status {resp.status_code}: {resp.text}")
            except requests.exceptions.RequestException as e:
                logger.warning(f"Cannot reach server at {api_endpoint}: {e}. Retrying in {self.interval}s...")
            except Exception as e:
                logger.error(f"Unexpected error collecting metrics: {e}", exc_info=True)

            time.sleep(self.interval)


if __name__ == "__main__":
    agent = MonitoringAgent()
    try:
        agent.run()
    except KeyboardInterrupt:
        logger.info("Agent stopped by user.")
