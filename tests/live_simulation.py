import json
import os
import subprocess
import sys
import time
import requests

SERVER_URL = "http://127.0.0.1:8000"


def run_simulation():
    print("[1/5] Starting FastAPI server on port 8000...")
    env = os.environ.copy()
    env["PYTHONPATH"] = "."

    server_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "server.main:app", "--host", "127.0.0.1", "--port", "8000"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    # Wait for server to come online
    server_ready = False
    for attempt in range(15):
        time.sleep(1)
        try:
            r = requests.get(f"{SERVER_URL}/api/status", timeout=2)
            if r.status_code == 200:
                server_ready = True
                print(" -> Server is online!")
                break
        except Exception:
            pass

    if not server_ready:
        server_proc.kill()
        out, err = server_proc.communicate()
        print("Server failed to start:\n", out, err)
        sys.exit(1)

    try:
        print("[2/5] Starting Monitoring Agent in background...")
        # Create temporary agent config pointing to port 8000
        agent_config = {
            "server_url": SERVER_URL,
            "node_id": "rpi5-simulation-node",
            "interval_seconds": 1,
            "timeout_seconds": 3,
        }
        with open("agent/agent_config.json", "w", encoding="utf-8") as f:
            json.dump(agent_config, f, indent=2)

        agent_proc = subprocess.Popen(
            [sys.executable, "agent/agent.py"],
            cwd="agent",
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        print("[3/5] Waiting for agent telemetry to arrive at server...")
        telemetry_received = False
        for _ in range(10):
            time.sleep(1.5)
            r = requests.get(f"{SERVER_URL}/api/status")
            status = r.json()
            nodes = status.get("nodes", {})
            if "rpi5-simulation-node" in nodes:
                node = nodes["rpi5-simulation-node"]
                print(f" -> Telemetry received! Node: {node['node_id']}, OS: {node['os']}, CPU Temp: {node['cpu_temp']}°C, CPU Usage: {node['cpu_usage']}%, Memory: {node['mem_usage']}%")
                telemetry_received = True
                break

        if not telemetry_received:
            print("Failed to receive telemetry from agent!")
            sys.exit(1)

        print("[4/5] Testing Fan Control & Mock Temperatures...")
        status = requests.get(f"{SERVER_URL}/api/status").json()
        print(f" -> 1-Wire Sensors detected ({len(status['sensors'])}):")
        for s in status['sensors']:
            print(f"    - [{s['id']}] {s['alias']}: {s['temp']}°C")

        print(f" -> Auto mode fan target duty: {status['target_fan_duty']}%")
        print(" -> Changing Fan mode to MANUAL (Channel 1: 85%, Channel 4: 95%)...")
        fan_res = requests.post(
            f"{SERVER_URL}/api/fans",
            json={"auto_mode": False, "manual_duties": {"1": 85, "4": 95}}
        )
        assert fan_res.status_code == 200

        updated_status = requests.get(f"{SERVER_URL}/api/status").json()
        assert updated_status["auto_mode"] is False
        fans_map = {f["channel"]: f["duty_cycle"] for f in updated_status["fans"]}
        print(f" -> Updated fan duties: {fans_map}")
        assert fans_map[1] == 85
        assert fans_map[4] == 95

        # Switch back to Auto
        requests.post(f"{SERVER_URL}/api/fans", json={"auto_mode": True})
        print(" -> Switched back to AUTO mode successfully.")

        print("[5/5] Testing Web Dashboard HTML...")
        index_res = requests.get(f"{SERVER_URL}/")
        assert index_res.status_code == 200
        assert "홈 서버랙 통합 컨트롤러" in index_res.text
        print(" -> Web dashboard index.html retrieved successfully.")

        print("\n>>> All live simulation checks passed with 100% success! <<<")

    finally:
        print("Cleaning up processes...")
        try:
            agent_proc.terminate()
            agent_proc.wait(timeout=2)
        except Exception:
            try:
                agent_proc.kill()
            except Exception:
                pass

        try:
            server_proc.terminate()
            server_proc.wait(timeout=2)
        except Exception:
            try:
                server_proc.kill()
            except Exception:
                pass


if __name__ == "__main__":
    run_simulation()
