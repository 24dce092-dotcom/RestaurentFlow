@echo off
setlocal
echo ===============================================
echo   RestaurantFlow - Build Frontend + Start API
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
echo [2/2] Starting Backend Server...
pushd "backend"
set SKIP_PRINTERS=1
node index.js
popd

endlocal
pause
