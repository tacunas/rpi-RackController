from contextlib import asynccontextmanager
import logging
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from server.controller import RackController
from server.models import (
    FanControlRequest,
    FanCurveConfig,
    NodeMetric,
    SensorAliasRequest,
    SystemStatusResponse,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("rack.main")

controller: RackController = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global controller
    config_file = os.getenv("RACK_CONFIG", "config.json")
    controller = RackController(config_path=config_file)
    controller.start()
    logger.info("Rack Controller Server initialized and background loop running.")
    try:
        yield
    finally:
        if controller:
            await controller.stop()
        logger.info("Rack Controller Server shutdown.")


app = FastAPI(
    title="Rack Controller Server",
    description="4-Channel PWM Fan & Cluster Node Monitoring Controller for Raspberry Pi 5",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Endpoints
@app.post("/api/metrics", status_code=200)
async def post_metrics(metric: NodeMetric, request: Request):
    """Receive system metrics reported by an agent node."""
    if not metric.ip_address:
        client_host = request.client.host if request.client else None
        metric.ip_address = client_host

    await controller.record_metric(metric)
    return {"status": "ok", "node_id": metric.node_id}


@app.get("/api/status", response_model=SystemStatusResponse)
async def get_status():
    """Retrieve complete cluster, temperature sensor, and fan status."""
    return controller.get_system_status()


@app.post("/api/fans")
async def update_fans(req: FanControlRequest):
    """Update fan control mode (auto/manual) and channel duty cycles."""
    await controller.update_fan_control(req)
    return {
        "status": "ok",
        "auto_mode": controller.auto_mode,
        "duties": controller.hardware.get_all_channel_duties(),
    }


@app.post("/api/config/sensor-alias")
async def set_sensor_alias(req: SensorAliasRequest):
    """Update alias for a DS18B20 sensor ID."""
    await controller.update_sensor_alias(req.sensor_id, req.alias)
    return {"status": "ok", "sensor_id": req.sensor_id, "alias": req.alias}


@app.get("/api/config")
async def get_config():
    """Get the full current configuration."""
    return controller.config


@app.post("/api/config/curve")
async def update_curve(curve: FanCurveConfig):
    """Update fan curve thresholds."""
    await controller.update_fan_curve(curve)
    return {"status": "ok", "curve": curve.model_dump()}


# Serve static web dashboard
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("<h2>Dashboard is loading or index.html is missing...</h2>")
