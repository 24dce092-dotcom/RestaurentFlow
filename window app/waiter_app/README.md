# Waiter App - Windows Desktop

A Flutter Windows desktop application for waiters in the restaurant management system.

## Features

This app provides access to waiter-specific functionality:
- **Table Management History** - View and manage table history
- **Waiter Order Taking** - Take orders from customers

## Prerequisites

1. **Flutter SDK** - Install Flutter for Windows
2. **WebView2 Runtime** - Required for the WebView functionality
   - Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
   - Usually pre-installed on Windows 10/11
3. **Restaurant Web App** - The main web application must be running on `localhost:5173`

## Setup & Installation

1. **Install dependencies:**
   ```powershell
   flutter pub get
   ```

2. **Ensure WebView2 is installed:**
   - Check if WebView2 is installed on your system
   - If not, download and install from Microsoft

3. **Start the web server:**
   - Navigate to your main restaurant web app
   - Start the development server on port 5173
   ```powershell
   # In your web app directory
   npm run dev
   # or
   yarn dev
   ```

## Running the App

### Development Mode
```powershell
flutter run -d windows
```

### Building for Release
```powershell
flutter build windows --release
```

The built application will be in `build\windows\x64\runner\Release\`

## Usage

1. **Launch the app** - The waiter app will start and load the table management page
2. **Navigation** - Use the menu button (⋮) in the top-right to switch between:
   - Table Management History
   - Waiter Order Taking
3. **Web Server Required** - Make sure the main web application is running on localhost:5173

## Troubleshooting

### App shows loading screen
- Verify the web server is running on `localhost:5173`
- Check Windows firewall settings
- Ensure WebView2 runtime is installed

### WebView not working
- Install/update WebView2 runtime
- Check Windows updates
- Try running as administrator

### Build errors
- Run `flutter doctor` to check Flutter installation
- Ensure Windows development tools are properly installed
- Clean and rebuild: `flutter clean && flutter pub get`

## Security Note

This app is restricted to waiter functionality only. Navigation to unauthorized pages is prevented at the application level.
