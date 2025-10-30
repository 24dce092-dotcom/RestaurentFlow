@echo off
setlocal
echo ===============================================
echo   RestaurantFlow - PRODUCTION START (Printers)
echo ===============================================
echo.

REM Jump to repo root (folder containing this script)
cd /d "%~dp0"

echo [1/2] Building frontend (restaurantflow)...
pushd "restaurantflow"
if not exist node_modules (
  echo Installing frontend dependencies...
  npm install
)
call npm run build
if errorlevel 1 (
  echo.
  echo Frontend build failed. Please fix errors and try again.
  popd
  pause
  exit /b 1
)
popd

echo.
echo [2/2] Starting Backend with printers ENABLED...
pushd "backend"
REM Ensure dependencies
if not exist node_modules (
  echo Installing backend dependencies...
  npm install
)
REM Clear SKIP_PRINTERS to allow real printer initialization
set SKIP_PRINTERS=
node index.js
popd

endlocal
pause

