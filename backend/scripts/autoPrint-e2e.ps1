# Auto Print E2E Test Script (uses dev-pay route) 
param(
  [int] $Port = 5001,
  [switch] $SkipPaid
)

function Test-Port {
  param([int]$Port)
  try { 
    $r = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$Port/api/printers" -TimeoutSec 5
    if ($r.StatusCode -eq 200) { return $true }
  } catch {}
  return $false
}

$ErrorActionPreference = 'Stop'
if (-not (Test-Port -Port $Port)) {
  Write-Host "[E2E] Server not responding on port $Port - check if backend is running" -ForegroundColor Red
  exit 1
}
Write-Host "[E2E] Using backend port $Port" -ForegroundColor Cyan

# Fetch printers
$printersResp = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$Port/api/printers"
$printersObj = $printersResp.Content | ConvertFrom-Json
$printerId = $printersObj.printers[0].id
Write-Host "[E2E] Printer chosen: $printerId"

# Enable config
$cfg = @{ enabled=$true; triggers=@('bill_created','bill_paid'); targets=@{ receipt=@{ printerId=$printerId; format='receipt'; active=$true }; kitchen=@{ printerId=$null; format='kitchen'; active=$false }; backup=@{ printerId=$null; format='receipt'; active=$false } }; retry=@{ attempts=2; delayMs=1500; backoffFactor=2 } } | ConvertTo-Json -Depth 6
Invoke-WebRequest -UseBasicParsing -Method PUT -Uri "http://localhost:$Port/api/auto-print/config" -ContentType 'application/json' -Body $cfg | Out-Null
Write-Host "[E2E] Auto print enabled"

# Seed a bill
$bill = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "http://localhost:$Port/api/debug/seed-pending-bill" -ContentType 'application/json' -Body (@{ tableNumber=77 } | ConvertTo-Json) | Select-Object -Expand Content | ConvertFrom-Json
$billId = $bill._id
Write-Host "[E2E] Seed bill id: $billId"

Start-Sleep -Seconds 2
$afterCreate = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$Port/api/auto-print/health" | Select-Object -Expand Content
Write-Host "[E2E] Health after create: $afterCreate"

if (-not $SkipPaid) {
  # Trigger paid event
  Invoke-WebRequest -UseBasicParsing -Method POST -Uri "http://localhost:$Port/api/bills/$billId/dev-pay" | Out-Null
  Start-Sleep -Seconds 2
  $afterPaid = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$Port/api/auto-print/health" | Select-Object -Expand Content
  Write-Host "[E2E] Health after paid: $afterPaid"
}

Write-Host "[E2E] COMPLETE" -ForegroundColor Green
