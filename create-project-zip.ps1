# Script to create a zip file of the restaurant flow project
# Excludes node_modules, build artifacts, and other temporary files

$projectRoot = "c:\Users\patel\Videos\backup\restaurantflow(inOneDevice)"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$zipFileName = "restaurantflow-project-$timestamp.zip"
$zipPath = Join-Path $projectRoot $zipFileName

Write-Host "Creating zip file: $zipFileName" -ForegroundColor Green
Write-Host "This may take a few minutes..." -ForegroundColor Yellow

# Define exclusion patterns
$excludePatterns = @(
    "node_modules",
    "dist",
    "dist-admin",
    "build",
    "build-admin",
    ".git",
    "*.log",
    "logs",
    "*.err",
    "android/app/build",
    "android/.gradle",
    "android-admin/app/build",
    "android-admin/.gradle",
    ".tauri/target",
    "src-tauri/target",
    "*.zip",
    ".vscode",
    ".idea",
    "*.exe",
    "nssm"
)

# Create a temporary directory for the filtered project
$tempDir = Join-Path $env:TEMP "restaurantflow-temp"
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}

Write-Host "Copying project files (excluding build artifacts)..." -ForegroundColor Cyan

# Use robocopy to copy files excluding certain patterns
$excludeArgs = @()
foreach ($pattern in $excludePatterns) {
    if ($pattern.Contains("*")) {
        # File patterns
        $excludeArgs += "/XF"
        $excludeArgs += $pattern
    } else {
        # Directory patterns
        $excludeArgs += "/XD"
        $excludeArgs += $pattern
    }
}

$robocopyArgs = @($projectRoot, $tempDir, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS") + $excludeArgs
$result = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -Wait -NoNewWindow -PassThru

# Robocopy exit codes: 0-7 are success, 8+ are errors
if ($result.ExitCode -ge 8) {
    Write-Host "Error copying files. Exit code: $($result.ExitCode)" -ForegroundColor Red
    exit 1
}

Write-Host "Creating zip archive..." -ForegroundColor Cyan

# Create the zip file
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -CompressionLevel Optimal -Force

# Clean up temp directory
Remove-Item -Path $tempDir -Recurse -Force

$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host "`nZip file created successfully!" -ForegroundColor Green
Write-Host "Location: $zipPath" -ForegroundColor Yellow
Write-Host "Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Yellow
Write-Host "`nExcluded items:" -ForegroundColor Cyan
$excludePatterns | ForEach-Object { Write-Host "  - $_" }
