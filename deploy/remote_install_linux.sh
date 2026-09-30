#!/usr/bin/env bash
set -e

NODE_ID="$1"
SERVER_URL="http://192.168.219.118:8000"

if [ -z "$NODE_ID" ]; then
  NODE_ID="$(hostname)"
fi

echo "=========================================="
echo " 🚀 Setting up Rack Monitoring Agent: $NODE_ID"
echo " Target Server: $SERVER_URL"
echo "=========================================="

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "[*] Node.js not found. Installing Node.js 20 LTS..."
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y nodejs
  else
    echo "[!] Unsupported package manager. Please install Node.js."
    exit 1
  fi
fi

echo "[+] Node.js version: $(node -v)"

# 2. Check PM2
if ! command -v pm2 >/dev/null 2>&1; then
  echo "[*] PM2 not found. Installing PM2 globally..."
  sudo npm install -g pm2
fi

echo "[+] PM2 version: $(pm2 -v)"

# 3. Setup Agent Directory
AGENT_DIR="$HOME/rack-agent"
mkdir -p "$AGENT_DIR"
cd "$AGENT_DIR"

# Generate agent_config.json
cat <<EOF > "$AGENT_DIR/agent_config.json"
{
  "server_url": "$SERVER_URL",
  "node_id": "$NODE_ID",
  "interval_seconds": 3,
  "timeout_seconds": 5
}
EOF

# 4. Stop existing instance if any
pm2 delete rack-agent 2>/dev/null || true

# 5. Start Agent via PM2
pm2 start "$AGENT_DIR/agent.js" --name rack-agent

# 6. PM2 Startup & Save
echo "[*] Registering PM2 startup service..."
if [ "$USER" = "root" ]; then
  pm2 startup 2>/dev/null || true
else
  sudo env PATH=$PATH:$(dirname $(which node)) pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null || pm2 startup 2>/dev/null || true
fi
pm2 save

echo "=========================================="
echo " [+] Agent successfully installed and active on $NODE_ID!"
echo "=========================================="
pm2 status rack-agent
