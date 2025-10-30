param(
  [switch]$SkipBuild,
  [switch]$UseRepoIcon
)

$ErrorActionPreference = 'Stop'

# Paths
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$windowAppRoot = Split-Path $scriptRoot -Parent
$repoRoot = Split-Path $windowAppRoot -Parent

$iconSource = Join-Path $repoRoot 'icon.ico'

$waiterApp = Join-Path $windowAppRoot 'waiter_app'
$adminApp  = Join-Path $windowAppRoot 'admin_manager_app'

$waiterResources = Join-Path $waiterApp 'windows\runner\resources'
$adminResources  = Join-Path $adminApp  'windows\runner\resources'

$waiterExe = Join-Path $waiterApp 'build\windows\x64\runner\Release\waiter_app.exe'
$adminExe  = Join-Path $adminApp  'build\windows\x64\runner\Release\admin_manager_app.exe'

function Write-Section($msg) { Write-Host "`n==== $msg ====" -ForegroundColor Cyan }

Write-Section "Preparing icons"
if ($UseRepoIcon) {
  if (Test-Path $iconSource) {
    Write-Host "Using custom icon: $iconSource"
    Copy-Item $iconSource (Join-Path $waiterResources 'app_icon.ico') -Force
    Copy-Item $iconSource (Join-Path $adminResources  'app_icon.ico') -Force
  } else {
    Write-Warning "icon.ico not found at repo root: $repoRoot. Using existing default icons."
  }
} else {
  Write-Host "Keeping existing icons (default Flutter icon)"
}

if (-not $SkipBuild) {
  Write-Section "Building Waiter App (Release)"
  Push-Location $waiterApp
  & flutter build windows --release --cmake-args="-Wno-dev"
  Pop-Location

  Write-Section "Building Admin Manager App (Release)"
  Push-Location $adminApp
  & flutter build windows --release --cmake-args="-Wno-dev"
  Pop-Location
} else {
  Write-Host "Skipping builds as per -SkipBuild"
}

Write-Section "Creating desktop shortcuts"
$desktop = [Environment]::GetFolderPath('Desktop')
$WshShell = New-Object -ComObject WScript.Shell

function New-Shortcut($name, $exePath) {
  $lnk = Join-Path $desktop $name
  if (-not (Test-Path $exePath)) {
    Write-Warning "Executable not found: $exePath. Shortcut will still be created but may not work until you build."
  }
  $shortcut = $WshShell.CreateShortcut($lnk)
  $shortcut.TargetPath = $exePath
  $shortcut.WorkingDirectory = Split-Path $exePath -Parent
  $shortcut.IconLocation = $exePath
  $shortcut.Save()
  Write-Host "Shortcut created: $lnk" -ForegroundColor Green
}

New-Shortcut 'Waiter App.lnk' $waiterExe
New-Shortcut 'Admin Manager App.lnk' $adminExe

Write-Section "Done"