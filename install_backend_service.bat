@echo off
setlocal
set NSSM_DIR=%~dp0nssm
set NSSM_EXE=%NSSM_DIR%\nssm.exe
set NODE_EXE=C:\Program Files\nodejs\node.exe
set BACKEND_JS=%~dp0backend\index.js
set BACKEND_DIR=%~dp0backend
set SERVICE_NAME=RestaurantFlowBackend
set BACKEND_PORT=5001
set LOG_DIR=%BACKEND_DIR%\logs
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Download NSSM if not present
if not exist "%NSSM_EXE%" (
  echo Downloading NSSM...
  powershell -Command "Invoke-WebRequest -Uri https://nssm.cc/release/nssm-2.24.zip -OutFile '%~dp0nssm.zip'"
  powershell -Command "Expand-Archive -Path '%~dp0nssm.zip' -DestinationPath '%NSSM_DIR%'"
  copy "%NSSM_DIR%\nssm-2.24\win64\nssm.exe" "%NSSM_EXE%"
  del "%~dp0nssm.zip"
)

REM Install the service
"%NSSM_EXE%" install %SERVICE_NAME% "%NODE_EXE%" "%BACKEND_JS%"
"%NSSM_EXE%" set %SERVICE_NAME% AppDirectory "%BACKEND_DIR%"
"%NSSM_EXE%" set %SERVICE_NAME% Start SERVICE_AUTO_START
"%NSSM_EXE%" set %SERVICE_NAME% AppStdout "%LOG_DIR%\service.out.log"
"%NSSM_EXE%" set %SERVICE_NAME% AppStderr "%LOG_DIR%\service.err.log"
rem Uncomment the next lines if you want to set environment variables for the service
rem "%NSSM_EXE%" set %SERVICE_NAME% AppEnvironmentExtra "PORT=%BACKEND_PORT%"
rem "%NSSM_EXE%" set %SERVICE_NAME% AppEnvironmentExtra "MONGO_URI=mongodb://127.0.0.1:27017/restaurantflow"
rem "%NSSM_EXE%" set %SERVICE_NAME% AppEnvironmentExtra "SKIP_PRINTERS=1"

rem Configure service recovery (restart on failure)
sc failure %SERVICE_NAME% reset= 86400 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1
sc failureflag %SERVICE_NAME% 1 >nul 2>&1

rem Add firewall rule for incoming traffic on backend port
netsh advfirewall firewall show rule name="RestaurantFlow Backend %BACKEND_PORT%" >nul 2>&1
if errorlevel 1 (
  netsh advfirewall firewall add rule name="RestaurantFlow Backend %BACKEND_PORT%" dir=in action=allow protocol=TCP localport=%BACKEND_PORT% profile=private
)

REM Start the service
net start %SERVICE_NAME%
echo Service %SERVICE_NAME% installed and started!
endlocal
pause
