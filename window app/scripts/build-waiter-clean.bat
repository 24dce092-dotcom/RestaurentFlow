@echo off
cd /d "c:\Users\patel\Videos\backup\restaurantflow(inOneDevice)\window app\waiter_app"
echo Building Waiter App (Release)...
flutter build windows --release --cmake-args="-Wno-dev"
echo.
echo Build complete!
pause