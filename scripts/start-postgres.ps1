$ErrorActionPreference = "Stop"

$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
$dataDir = "C:\tmp\secili_pazar_pgdata"
$logFile = "C:\tmp\secili_pazar_pg.log"

function Test-PortOpen {
  param([int]$Port)

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $connection
}

if (Test-PortOpen -Port 5432) {
  Write-Host "PostgreSQL zaten calisiyor: localhost:5432"
  exit 0
}

if (-not (Test-Path $pgCtl)) {
  Write-Warning "pg_ctl.exe bulunamadi: $pgCtl"
  Write-Warning "PostgreSQL zaten servis olarak calisiyorsa bu uyari onemsizdir. Degilse PostgreSQL'i manuel baslatin."
  exit 0
}

if (-not (Test-Path $dataDir)) {
  Write-Warning "Yerel PostgreSQL data klasoru bulunamadi: $dataDir"
  Write-Warning "Juri veya farkli bilgisayarlarda PostgreSQL'i normal servis/pgAdmin uzerinden baslatip migration adimlarini calistirin."
  exit 0
}

& $pgCtl -D $dataDir -l $logFile -o "-p 5432" start
Start-Sleep -Seconds 3

if (-not (Test-PortOpen -Port 5432)) {
  throw "PostgreSQL baslatilamadi. Log: $logFile"
}

Write-Host "PostgreSQL baslatildi: localhost:5432"
