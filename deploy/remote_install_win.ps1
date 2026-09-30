param(
  [string]$NodeId = "DX-121",
  [string]$ServerUrl = "http://192.168.219.118:8000"
)

$ErrorActionPreference = "Stop"

Write-Host "=========================================="
Write-Host " Setting up Rack Monitoring Agent: $NodeId"
Write-Host " Target Server: $ServerUrl"
Write-Host "=========================================="

$AgentDir = "$HOME\rack-agent"
if (-not (Test-Path $AgentDir)) {
  New-Item -ItemType Directory -Force -Path $AgentDir | Out-Null
}
Set-Location $AgentDir

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[!] Node.js is not found. Please install Node.js on Windows."
  exit 1
}

# Download agent.js
Invoke-WebRequest -Uri "$ServerUrl/static/agent.js" -OutFile "$AgentDir\agent.js"

# Check PM2
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
  Write-Host "[*] Installing PM2 globally via npm..."
  npm install -g pm2
}

# Write agent_config.json
$config = @"
{
  "server_url": "$ServerUrl",
  "node_id": "$NodeId",
  "interval_seconds": 3,
  "timeout_seconds": 5
}
"@
$config | Out-File -Encoding utf8 -FilePath "$AgentDir\agent_config.json"

# Stop existing if any
try { pm2 delete rack-agent 2>$null } catch {}

# Start with PM2
pm2 start "$AgentDir\agent.js" --name rack-agent
pm2 save

Write-Host "=========================================="
Write-Host " Agent successfully installed and registered on $NodeId!"
Write-Host "=========================================="
pm2 status rack-agent
