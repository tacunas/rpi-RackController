import asyncio
import json
import logging
import os
import time
from typing import Dict, List, Optional

from server.hardware import HardwareManager
from server.models import (
    FanChannelStatus,
    FanControlRequest,
    FanCurveConfig,
    NodeMetric,
    NodeStatus,
    SensorReading,
    SystemStatusResponse,
)

logger = logging.getLogger("rack.controller")


class RackController:
    """Core controller coordinating node telemetry, fan curves, and hardware."""

    def __init__(self, config_path: str = "config.json"):
        self.config_path = os.path.abspath(config_path)
        self.config = self._load_config()

        # Hardware manager
        hw_conf = self.config.get("hardware", {})
        self.hardware = HardwareManager(
            frequency_hz=hw_conf.get("pwm_frequency_hz", 100),
            channel_configs=hw_conf.get("channels"),
        )

        # Telemetry state
        self.nodes: Dict[str, NodeStatus] = {}
        self.latest_sensors: List[SensorReading] = []
        self.node_timeout_seconds = self.config.get("server", {}).get(
            "node_timeout_seconds", 10
        )

        # Fan control state
        fan_conf = self.config.get("fan_control", {})
        self.auto_mode: bool = fan_conf.get("auto_mode", True)
        self.fan_curve = FanCurveConfig(
            rack_temp_min=fan_conf.get("rack_temp_min", 30.0),
            rack_temp_max=fan_conf.get("rack_temp_max", 50.0),
            node_temp_min=fan_conf.get("node_temp_min", 45.0),
            node_temp_max=fan_conf.get("node_temp_max", 80.0),
            min_fan_duty=fan_conf.get("min_fan_duty", 30),
            max_fan_duty=fan_conf.get("max_fan_duty", 100),
        )
        self.manual_duties: Dict[str, int] = fan_conf.get(
            "manual_duties", {"1": 50, "2": 50, "3": 50, "4": 50}
        )
        self.target_fan_duty: int = 50

        # Sensor aliases
        self.sensor_aliases: Dict[str, str] = self.config.get("sensor_aliases", {})

        # Task runner flag
        self._running = False
        self._bg_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    def _load_config(self) -> dict:
        """Load configuration from config.json or use defaults."""
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading {self.config_path}: {e}")
        return {}

    def _save_config(self):
        """Persist current configuration to config.json."""
        self.config["fan_control"] = {
            "auto_mode": self.auto_mode,
            "rack_temp_min": self.fan_curve.rack_temp_min,
            "rack_temp_max": self.fan_curve.rack_temp_max,
            "node_temp_min": self.fan_curve.node_temp_min,
            "node_temp_max": self.fan_curve.node_temp_max,
            "min_fan_duty": self.fan_curve.min_fan_duty,
            "max_fan_duty": self.fan_curve.max_fan_duty,
            "manual_duties": self.manual_duties,
        }
        self.config["sensor_aliases"] = self.sensor_aliases

        try:
            temp_path = f"{self.config_path}.tmp"
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            os.replace(temp_path, self.config_path)
            logger.info("Configuration successfully persisted to config.json.")
        except Exception as e:
            logger.error(f"Failed to persist config.json: {e}")

    async def record_metric(self, metric: NodeMetric):
        """Record telemetry metric received from a node agent."""
        now = time.time()
        async with self._lock:
            status = NodeStatus(
                node_id=metric.node_id,
                os=metric.os,
                cpu_temp=metric.cpu_temp,
                cpu_usage=metric.cpu_usage,
                mem_usage=metric.mem_usage,
                disk_usage=metric.disk_usage,
                load_avg=metric.load_avg,
                uptime=metric.uptime,
                ip_address=metric.ip_address,
                hostname=metric.hostname,
                online=True,
                last_seen=now,
            )
            self.nodes[metric.node_id] = status

    def _update_node_liveness(self, now: float):
        """Mark nodes as offline if they have timed out."""
        for node in self.nodes.values():
            if now - node.last_seen > self.node_timeout_seconds:
                node.online = False

    def calculate_auto_fan_duty(
        self, max_rack_temp: Optional[float], max_node_temp: Optional[float]
    ) -> int:
        """Calculate fan duty cycle using linear interpolation across thresholds."""
        curve = self.fan_curve

        # 1. Rack temperature curve
        if max_rack_temp is not None:
            if max_rack_temp <= curve.rack_temp_min:
                rack_duty = curve.min_fan_duty
            elif max_rack_temp >= curve.rack_temp_max:
                rack_duty = curve.max_fan_duty
            else:
                ratio = (max_rack_temp - curve.rack_temp_min) / (
                    curve.rack_temp_max - curve.rack_temp_min
                )
                rack_duty = curve.min_fan_duty + ratio * (
                    curve.max_fan_duty - curve.min_fan_duty
                )
        else:
            rack_duty = curve.min_fan_duty

        # 2. Node CPU temperature curve
        if max_node_temp is not None:
            if max_node_temp <= curve.node_temp_min:
                node_duty = curve.min_fan_duty
            elif max_node_temp >= curve.node_temp_max:
                node_duty = curve.max_fan_duty
            else:
                ratio = (max_node_temp - curve.node_temp_min) / (
                    curve.node_temp_max - curve.node_temp_min
                )
                node_duty = curve.min_fan_duty + ratio * (
                    curve.max_fan_duty - curve.min_fan_duty
                )
        else:
            node_duty = curve.min_fan_duty

        # Take higher demand, clamped to min/max fan duty
        target = int(round(max(rack_duty, node_duty, curve.min_fan_duty)))
        target = max(curve.min_fan_duty, min(curve.max_fan_duty, target))
        return target

    async def update_fan_control(self, req: FanControlRequest):
        """Update fan control mode and manual duty cycles."""
        async with self._lock:
            if req.auto_mode is not None:
                self.auto_mode = req.auto_mode

            if req.manual_duties:
                for ch_str, duty in req.manual_duties.items():
                    try:
                        ch = int(ch_str)
                        if 1 <= ch <= 4:
                            self.manual_duties[str(ch)] = max(0, min(100, int(duty)))
                    except ValueError:
                        continue

            # Apply immediate hardware changes if manual mode
            if not self.auto_mode:
                for ch in range(1, 5):
                    duty = self.manual_duties.get(str(ch), 50)
                    self.hardware.set_channel_duty(ch, duty)

            self._save_config()

    async def update_sensor_alias(self, sensor_id: str, alias: str):
        """Update display alias for a 1-Wire sensor and save config."""
        async with self._lock:
            self.sensor_aliases[sensor_id] = alias.strip()
            self._save_config()

    async def update_fan_curve(self, curve: FanCurveConfig):
        """Update fan curve thresholds and save config."""
        async with self._lock:
            self.fan_curve = curve
            self._save_config()

    async def step(self):
        """One cycle of sensor reading, liveness update, and fan adjustment."""
        now = time.time()

        # Update liveness of agent nodes
        self._update_node_liveness(now)

        # Read 1-Wire sensors
        raw_readings = await self.hardware.read_temperatures(self.sensor_aliases)
        self.latest_sensors = [SensorReading(**r) for r in raw_readings]

        # Calculate maximum temperatures
        max_rack = (
            max((s.temp for s in self.latest_sensors), default=None)
            if self.latest_sensors
            else None
        )

        online_nodes = [n for n in self.nodes.values() if n.online]
        max_node = (
            max((n.cpu_temp for n in online_nodes), default=None)
            if online_nodes
            else None
        )

        # Apply fan duties
        if self.auto_mode:
            self.target_fan_duty = self.calculate_auto_fan_duty(max_rack, max_node)
            for ch in range(1, 5):
                self.hardware.set_channel_duty(ch, self.target_fan_duty)
        else:
            # Manual mode: enforce manual duties
            for ch in range(1, 5):
                duty = self.manual_duties.get(str(ch), 50)
                self.hardware.set_channel_duty(ch, duty)

    async def background_loop(self):
        """Continuous background loop running every 2 seconds."""
        logger.info("Background control loop started (interval: 2s).")
        while self._running:
            try:
                await self.step()
            except Exception as e:
                logger.error(f"Error in controller background loop: {e}", exc_info=True)
            await asyncio.sleep(2.0)

    def start(self):
        """Start the background control loop."""
        if not self._running:
            self._running = True
            self._bg_task = asyncio.create_task(self.background_loop())

    async def stop(self):
        """Stop background loop and clean up hardware."""
        self._running = False
        if self._bg_task:
            self._bg_task.cancel()
            try:
                await self._bg_task
            except asyncio.CancelledError:
                pass
        self.hardware.cleanup()
        logger.info("RackController stopped.")

    def get_system_status(self) -> SystemStatusResponse:
        """Produce full system status response for web dashboard."""
        now = time.time()
        self._update_node_liveness(now)

        # Fan status per channel
        fans = []
        ch_configs = self.config.get("hardware", {}).get("channels", {})
        duties = self.hardware.get_all_channel_duties()
        for ch in range(1, 5):
            ch_info = ch_configs.get(str(ch), {})
            fans.append(
                FanChannelStatus(
                    channel=ch,
                    name=ch_info.get("name", f"채널 {ch}"),
                    gpio=ch_info.get("gpio", 0),
                    duty_cycle=duties.get(ch, 50),
                )
            )

        online_nodes = [n for n in self.nodes.values() if n.online]
        max_rack = (
            max((s.temp for s in self.latest_sensors), default=None)
            if self.latest_sensors
            else None
        )
        max_node = (
            max((n.cpu_temp for n in online_nodes), default=None)
            if online_nodes
            else None
        )

        return SystemStatusResponse(
            nodes=self.nodes,
            sensors=self.latest_sensors,
            fans=fans,
            auto_mode=self.auto_mode,
            mock_mode=self.hardware.mock_mode or self.hardware.mock_sensors_active,
            max_rack_temp=max_rack,
            max_node_temp=max_node,
            target_fan_duty=self.target_fan_duty,
            online_nodes_count=len(online_nodes),
            total_nodes_count=len(self.nodes),
            timestamp=now,
        )
