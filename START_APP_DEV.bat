@echo off
setlocal
echo ===============================================
echo   RestaurantFlow - DEV START (LAN + Proxy)
echo ===============================================
echo.

REM Jump to repo root
cd /d "%~dp0"

REM 1) Start backend in a new window with printers skipped
start "Backend" cmd /K "cd /d "%cd%\backend" && if not exist node_modules (npm install) && set SKIP_PRINTERS=1 && node index.js"

REM 2) Start Vite dev server in a new window (LAN-enabled by vite.config)
start "Frontend" cmd /K "cd /d "%cd%\restaurantflow" && if not exist node_modules (npm install) && npm run start"

echo.
echo Windows may prompt to allow access - choose Private networks.
echo When ready, open http://<YOUR_PC_IP>:5173/waiter-order-taking on your phone.
echo.
echo Tip: If backend didn't start on 5001, set BACKEND_URL before Vite:
echo   set BACKEND_URL=http://localhost:5002 && npm run start
echo.
endlocal
exit /b 0

