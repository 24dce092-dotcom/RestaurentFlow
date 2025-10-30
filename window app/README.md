# Restaurant Management - Windows Desktop Apps

This folder contains two separate Flutter Windows desktop applications for the restaurant management system.

## Applications

### 1. Waiter App (`waiter_app/`)
**Purpose:** Limited access app for waiters and service staff
**Pages Access:**
- Table Management History
- Waiter Order Taking

**Features:**
- Simple, focused interface for waiters
- Navigation restricted to waiter-specific functions
- Quick switching between table management and order taking

### 2. Admin Manager App (`admin_manager_app/`)
**Purpose:** Full access app for administrators and managers
**Pages Access:**
- Live Orders Dashboard
- Table Management History  
- Billing & Payment Management
- Analytics & Reporting Dashboard
- Settings

**Features:**
- Complete administrative interface
- Advanced navigation with icons and quick access
- Full access to all business functions

## System Requirements

- **Windows 10/11** with WebView2 Runtime
- **Flutter SDK** installed and configured
- **Main Web Application** running on `localhost:5173`

## Quick Start

1. **Start the web server** (in main project directory):
   ```powershell
   cd restaurantflow
   npm run dev
   ```

2. **Run Waiter App:**
   ```powershell
   cd "window app/waiter_app"
   flutter run -d windows
   ```

3. **Run Admin App:**
   ```powershell
   cd "window app/admin_manager_app"
   flutter run -d windows
   ```

## Building for Production

### Build both apps:
```powershell
# Waiter App
cd "window app/waiter_app"
flutter build windows --release

# Admin Manager App
cd "window app/admin_manager_app"
flutter build windows --release
```

### Distribution:
- Waiter App: `waiter_app/build/windows/x64/runner/Release/`
- Admin App: `admin_manager_app/build/windows/x64/runner/Release/`

## Architecture

Both apps use the same pattern:
- **Flutter Framework** - Cross-platform UI framework
- **WebView Windows** - Embeds the web application
- **URL Routing** - Direct navigation to specific pages
- **Native Window** - Windows desktop integration

## Development Notes

- Both apps are essentially WebView wrappers around your existing web application
- The waiter app has restricted navigation (only 2 pages)
- The admin app has full navigation (5 pages) with enhanced UI
- WebView2 runtime handles the web rendering
- Apps automatically load the specified pages from localhost:5173

## Security & Access Control

- **Waiter App**: Limited to specific waiter functions only
- **Admin App**: Full administrative access to all features
- Both apps require the main web server to be running
- Access control is enforced at the Flutter app level

## Troubleshooting

### Common Issues:
1. **"Loading..." screen** - Web server not running on port 5173
2. **WebView errors** - WebView2 runtime not installed
3. **Build failures** - Flutter environment not properly configured

### Solutions:
- Check if web server is running: `netstat -an | findstr :5173`
- Install WebView2: Download from Microsoft Edge WebView2 page
- Verify Flutter: `flutter doctor`

## Support

For issues specific to:
- **Web Application**: Check main project documentation
- **Flutter Apps**: See individual app README files
- **Windows Integration**: Check WebView2 documentation