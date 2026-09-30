param(
  [string]$NodeId = "DX-121",
  [string]$ServerUrl = ""
)

$ErrorActionPreference = "Stop"

# Auto-detect best reachable Server URL if not provided
if (-not $ServerUrl) {
  $lanUrl = "http://192.168.219.118:8000"
  $tsUrl = "http://100.90.80.103:8000"
  try {
    $res = Invoke-WebRequest -Uri "$lanUrl/api/status" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    $ServerUrl = $lanUrl
  } catch {
    $ServerUrl = $tsUrl
  }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Setting up Rack Monitoring Agent: $NodeId" -ForegroundColor Cyan
Write-Host " Target Server: $ServerUrl" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$AgentDir = "$HOME\rack-agent"
if (-not (Test-Path $AgentDir)) {
  New-Item -ItemType Directory -Force -Path $AgentDir | Out-Null
}
Set-Location $AgentDir

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[*] Node.js not found. Attempting install via winget..." -ForegroundColor Yellow
  try {
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  } catch {
    Write-Host "[!] Node.js installation failed. Please install Node.js (https://nodejs.org) and retry." -ForegroundColor Red
    exit 1
  }
}

# Download latest agent.js from server
Write-Host "[*] Downloading agent.js from server..." -ForegroundColor Gray
Invoke-WebRequest -Uri "$ServerUrl/static/agent.js" -OutFile "$AgentDir\agent.js" -UseBasicParsing

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

# Register Raspberry Pi SSH public key for passwordless maintenance
try {
  $rpiPubKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEgBDxROfGK1mgTjBoEo5PYjVw6QX1WAkJ9tgoEQcgid jackson@rpi5"
  $sshDir = "$HOME\.ssh"
  if (-not (Test-Path $sshDir)) { New-Item -ItemType Directory -Path $sshDir -Force | Out-Null }
  $authKeys = "$sshDir\authorized_keys"
  $existing = if (Test-Path $authKeys) { Get-Content $authKeys -Raw } else { "" }
  if (-not $existing.Contains("jackson@rpi5")) {
    Add-Content -Path $authKeys -Value "`n$rpiPubKey" -Force
    Write-Host "[+] Raspberry Pi SSH public key registered in authorized_keys" -ForegroundColor Green
  }
} catch {}

# Start with PM2
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
  Write-Host "[*] Installing PM2 globally via npm..." -ForegroundColor Gray
  npm install -g pm2
}

try { pm2 delete rack-agent 2>$null } catch {}
pm2 start "$AgentDir\agent.js" --name rack-agent
pm2 save

Write-Host "==========================================" -ForegroundColor Green
Write-Host " Agent successfully installed and registered on $NodeId!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
pm2 status rack-agent
