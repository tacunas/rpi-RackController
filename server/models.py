from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class NodeMetric(BaseModel):
    """Metric reported from a monitoring agent."""
    node_id: str = Field(..., description="Unique identifier for the node (e.g. proxmox-01, rpi5-main)")
    os: str = Field(..., description="Operating System (e.g. Linux, Windows, Proxmox VE)")
    cpu_temp: float = Field(..., description="CPU temperature in degrees Celsius")
    cpu_usage: float = Field(..., description="CPU utilization percentage (0-100)")
    mem_usage: float = Field(..., description="Memory utilization percentage (0-100)")
    disk_usage: float = Field(..., description="Root disk utilization percentage (0-100)")
    load_avg: List[float] = Field(default_factory=list, description="Load averages (1, 5, 15 minutes)")
    uptime: int = Field(default=0, description="System uptime in seconds")
    ip_address: Optional[str] = Field(default=None, description="Primary IP address of the node")
    hostname: Optional[str] = Field(default=None, description="System hostname")
    timestamp: Optional[float] = Field(default=None, description="Epoch timestamp of report")


class NodeStatus(BaseModel):
    """In-memory node status tracked by the server controller."""
    node_id: str
    os: str
    cpu_temp: float
    cpu_usage: float
    mem_usage: float
    disk_usage: float
    load_avg: List[float] = Field(default_factory=list)
    uptime: int = 0
    ip_address: Optional[str] = None
    hostname: Optional[str] = None
    online: bool = True
    last_seen: float = 0.0


class SensorReading(BaseModel):
    """1-Wire DS18B20 temperature sensor reading."""
    id: str = Field(..., description="Sensor unique 1-Wire ID (e.g. 28-000001)")
    alias: str = Field(..., description="Human-friendly sensor display name")
    temp: float = Field(..., description="Measured temperature in degrees Celsius")


class FanChannelStatus(BaseModel):
    """Status of an individual PWM fan channel."""
    channel: int = Field(..., ge=1, le=4, description="Channel index (1-4)")
    name: str = Field(..., description="Channel location/role description")
    gpio: int = Field(..., description="BCM GPIO pin number")
    duty_cycle: int = Field(..., ge=0, le=100, description="Current duty cycle percentage (0-100)")


class FanControlRequest(BaseModel):
    """Request payload to change fan control mode and manual duty cycles."""
    auto_mode: Optional[bool] = Field(default=None, description="Enable (True) or disable (False) auto curve")
    manual_duties: Optional[Dict[str, int]] = Field(
        default=None,
        description="Target duty cycles keyed by channel string '1'-'4' (0-100%)"
    )


class SensorAliasRequest(BaseModel):
    """Request payload to update a sensor display alias."""
    sensor_id: str = Field(..., description="1-Wire sensor ID (e.g. 28-000001)")
    alias: str = Field(..., min_length=1, max_length=50, description="New alias name")


class FanCurveConfig(BaseModel):
    """Fan curve threshold configuration."""
    rack_temp_min: float = 30.0
    rack_temp_max: float = 50.0
    node_temp_min: float = 45.0
    node_temp_max: float = 80.0
    min_fan_duty: int = 30
    max_fan_duty: int = 100


class SystemStatusResponse(BaseModel):
    """Aggregated status response for the web dashboard."""
    nodes: Dict[str, NodeStatus]
    sensors: List[SensorReading]
    fans: List[FanChannelStatus]
    auto_mode: bool
    mock_mode: bool
    max_rack_temp: Optional[float] = None
    max_node_temp: Optional[float] = None
    target_fan_duty: int = 30
    online_nodes_count: int = 0
    total_nodes_count: int = 0
    timestamp: float
