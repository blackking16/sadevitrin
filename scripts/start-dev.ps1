$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $root "api"
$postgresScript = Join-Path $PSScriptRoot "start-postgres.ps1"

function Test-PortOpen {
  param([int]$Port)

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $connection
}

function Get-LanIPv4 {
  $privateIp = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' -and
      $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Docker|WSL'
    } |
    Sort-Object { if ($_.InterfaceAlias -match 'Wi-Fi|Wireless') { 0 } else { 1 } }, InterfaceAlias |
    Select-Object -First 1

  return $privateIp.IPAddress
}

$lanIp = Get-LanIPv4
if ($lanIp) {
  $env:EXPO_PUBLIC_API_URL = "http://$lanIp`:4000"
  Write-Host "Mobil API adresi: $env:EXPO_PUBLIC_API_URL"
} else {
  Write-Warning "Yerel ag IP adresi bulunamadi. Mobil cihaz API'ye erisemeyebilir."
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $postgresScript

if (Test-PortOpen -Port 4000) {
  Write-Host "API zaten calisiyor: http://localhost:4000"
} else {
  Write-Host "API baslatiliyor: http://localhost:4000"
  Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $apiDir -WindowStyle Hidden

  $ready = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    if (Test-PortOpen -Port 4000) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    Write-Warning "API 20 saniye icinde hazir olmadi. Ayrica kontrol et: cd api && npm run dev"
  }
}

Write-Host "Expo baslatiliyor."
& npx expo start
