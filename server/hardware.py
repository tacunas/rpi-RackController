import asyncio
import glob
import logging
import math
import os
import random
import re
import sys
import time
from typing import Dict, List, Optional

logger = logging.getLogger("rack.hardware")

# Channel pin definitions (BCM)
DEFAULT_CHANNELS = {
    1: {"name": "하단 흡기", "gpio": 12, "default_duty": 50},
    2: {"name": "서버/SBC층", "gpio": 13, "default_duty": 50},
    3: {"name": "전원/네트워크", "gpio": 18, "default_duty": 50},
    4: {"name": "상단 배기", "gpio": 19, "default_duty": 50},
}

W1_DEVICES_BASE = "/sys/bus/w1/devices"


class HardwareManager:
    """Manages 4-channel PWM fans and DS18B20 1-Wire temperature sensors.

    Includes automatic fallback to MockHardware when hardware or sensors
    are not available.
    """

    def __init__(
        self,
        frequency_hz: int = 100,
        channel_configs: Optional[Dict[str, dict]] = None,
        force_mock: bool = False,
    ):
        self.frequency_hz = frequency_hz
        self.channel_configs = channel_configs or DEFAULT_CHANNELS
        self.force_mock = force_mock

        self.mock_mode = False
        self.mock_sensors_active = False

        self._pwm_devices: Dict[int, object] = {}
        self._duty_cycles: Dict[int, int] = {ch: 50 for ch in range(1, 5)}
        self._mock_temperatures: Dict[str, float] = {
            "28-000001": 34.2,
            "28-000002": 37.8,
            "28-000003": 41.5,
        }
        self._start_time = time.time()

        if self.force_mock:
            logger.info("HardwareManager forced into Mock mode.")
            self._init_mock()
        else:
            self._init_hardware()

    def _init_hardware(self):
        """Attempt to initialize lgpio and GPIOZero PWM devices."""
        try:
            if not sys.platform.startswith("linux"):
                raise RuntimeError("Non-Linux platform detected.")

            from gpiozero.pins.lgpio import LGPIOFactory
            from gpiozero import PWMOutputDevice, Device

            Device.pin_factory = LGPIOFactory()

            # Initialize each PWM channel
            for ch_str, conf in self.channel_configs.items():
                ch = int(ch_str)
                gpio_pin = conf["gpio"]
                default_duty = conf.get("default_duty", 50)
                device = PWMOutputDevice(
                    gpio_pin,
                    frequency=self.frequency_hz,
                    initial_value=default_duty / 100.0,
                )
                self._pwm_devices[ch] = device
                self._duty_cycles[ch] = default_duty

            self.mock_mode = False
            logger.info("Real hardware initialized with LGPIOFactory on RP1 pins 12, 13, 18, 19.")

        except Exception as e:
            logger.warning(
                f"Hardware initialization failed ({e}). Falling back to MockHardware mode."
            )
            self._init_mock()

    def _init_mock(self):
        """Initialize mock hardware state."""
        self.mock_mode = True
        self._pwm_devices.clear()
        for ch_str, conf in self.channel_configs.items():
            ch = int(ch_str)
            self._duty_cycles[ch] = conf.get("default_duty", 50)
        logger.info("Mock hardware active. PWM and 1-Wire sensors are simulated.")

    def set_channel_duty(self, channel: int, duty_percent: int) -> int:
        """Set duty cycle for a specific channel (1-4). Range: 0-100%."""
        duty_percent = max(0, min(100, int(duty_percent)))
        self._duty_cycles[channel] = duty_percent

        if not self.mock_mode and channel in self._pwm_devices:
            try:
                device = self._pwm_devices[channel]
                device.value = duty_percent / 100.0
            except Exception as e:
                logger.error(f"Error setting PWM duty on channel {channel}: {e}")

        return duty_percent

    def get_channel_duty(self, channel: int) -> int:
        """Get current duty cycle (0-100%) for a channel."""
        return self._duty_cycles.get(channel, 0)

    def get_all_channel_duties(self) -> Dict[int, int]:
        """Return dict of channel -> duty_cycle."""
        return dict(self._duty_cycles)

    def _read_single_ds18b20_sync(self, device_path: str) -> Optional[float]:
        """Synchronously read and parse a single w1_slave file."""
        slave_file = os.path.join(device_path, "w1_slave")
        try:
            with open(slave_file, "r") as f:
                lines = f.readlines()
            if len(lines) < 2:
                return None

            # First line checks CRC
            if "YES" not in lines[0]:
                return None

            # Second line contains t=XXXXX
            match = re.search(r"t=(-?\d+)", lines[1])
            if match:
                raw_temp = float(match.group(1))
                return round(raw_temp / 1000.0, 1)
        except Exception as e:
            logger.debug(f"Failed reading sensor at {device_path}: {e}")
        return None

    def _get_mock_temperatures(self) -> List[dict]:
        """Generate realistic fluctuating temperatures for mock sensors."""
        t = time.time() - self._start_time
        results = []
        # Simulate slight fluctuation around baseline
        variations = {
            "28-000001": 34.0 + 1.5 * math.sin(t / 15.0) + (random.random() - 0.5) * 0.4,
            "28-000002": 37.5 + 2.0 * math.sin(t / 20.0 + 1.0) + (random.random() - 0.5) * 0.4,
            "28-000003": 41.0 + 2.5 * math.sin(t / 25.0 + 2.0) + (random.random() - 0.5) * 0.4,
        }
        for sensor_id, temp in variations.items():
            results.append({
                "id": sensor_id,
                "temp": round(temp, 1),
            })
        return results

    async def read_temperatures(self, sensor_aliases: Dict[str, str]) -> List[dict]:
        """Read all DS18B20 temperature sensors asynchronously.

        If hardware mock mode is active, or if no physical 1-Wire sensors
        are detected on the bus, returns simulated sensor readings.
        """
        if self.mock_mode:
            self.mock_sensors_active = True
            raw_data = self._get_mock_temperatures()
        else:
            # Check for real 1-Wire devices on the bus
            device_dirs = await asyncio.to_thread(
                glob.glob, os.path.join(W1_DEVICES_BASE, "28-*")
            )

            if not device_dirs:
                # No physical 1-Wire devices found; fallback to mock sensors
                self.mock_sensors_active = True
                raw_data = self._get_mock_temperatures()
            else:
                self.mock_sensors_active = False
                raw_data = []

                def _read_all():
                    readings = []
                    for d in device_dirs:
                        sensor_id = os.path.basename(d)
                        temp = self._read_single_ds18b20_sync(d)
                        if temp is not None:
                            readings.append({"id": sensor_id, "temp": temp})
                    return readings

                raw_data = await asyncio.to_thread(_read_all)

        # Attach aliases
        readings = []
        for item in raw_data:
            sensor_id = item["id"]
            alias = sensor_aliases.get(sensor_id, sensor_id)
            readings.append({
                "id": sensor_id,
                "alias": alias,
                "temp": item["temp"],
            })

        return readings

    def cleanup(self):
        """Release PWM GPIO devices cleanly."""
        for ch, device in list(self._pwm_devices.items()):
            try:
                device.close()
            except Exception as e:
                logger.debug(f"Error closing PWM channel {ch}: {e}")
        self._pwm_devices.clear()
        logger.info("HardwareManager cleanup complete.")
