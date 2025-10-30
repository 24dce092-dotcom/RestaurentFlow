@echo off
cd /d "c:\Users\patel\Videos\backup\restaurantflow(inOneDevice)\window app\admin_manager_app"
echo Building Admin Manager App (Release)...
flutter build windows --release --cmake-args="-Wno-dev"
echo.
echo Build complete!
pause