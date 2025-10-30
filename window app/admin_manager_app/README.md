# Admin Manager App - Windows Desktop

A Flutter Windows desktop application for administrators and managers in the restaurant management system.

## Features

This app provides full access to administrative functionality:
- **Live Orders Dashboard** - Monitor real-time orders and kitchen status
- **Table Management History** - Complete table and reservation management
- **Billing & Payment Management** - Handle billing, payments, and financial records
- **Analytics & Reporting** - View business analytics and generate reports
- **Settings** - Configure system settings and preferences

## Prerequisites

1. **Flutter SDK** - Install Flutter for Windows
2. **WebView2 Runtime** - Required for the WebView functionality
   - Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
   - Usually pre-installed on Windows 10/11
3. **Restaurant Web App** - The main web application must be running on `localhost:5173`
# Admin Manager App - Windows Desktop

A Flutter Windows desktop application for administrators and managers in the restaurant management system.

## Features

This app provides full access to administrative functionality:
- **Live Orders Dashboard** - Monitor real-time orders and kitchen status
- **Table Management History** - Complete table and reservation management
- **Billing & Payment Management** - Handle billing, payments, and financial records
- **Analytics & Reporting** - View business analytics and generate reports
- **Settings** - Configure system settings and preferences

## Prerequisites

1. **Flutter SDK** - Install Flutter for Windows
2. **WebView2 Runtime** - Required for the WebView functionality
   - Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
   - Usually pre-installed on Windows 10/11
3. **Restaurant Web App** - The main web application (frontend) is usually served from `localhost:5173` during development

## Setup & Installation

1. **Install dependencies:**
   ```powershell
   flutter pub get
   ```

2. **Ensure WebView2 is installed:**
   - Check if WebView2 is installed on your system
   - If not, download and install from Microsoft

3. **Start the web server (dev):**
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

1. **Launch the app** - The admin app will start and load the live orders dashboard
2. **Navigation Options:**
   - **Top Menu (⋮)** - Quick access dropdown menu
   - **Floating Action Button (⊞)** - Quick navigation dialog with icons
3. **Available Pages:**
   - 🏢 Live Orders Dashboard
   - 🍽️ Table Management History
   - 💳 Billing & Payment Management
   - 📊 Analytics & Reporting
   - ⚙️ Settings

## Navigation Features

### Quick Menu (Top Right)
- Dropdown menu with all available pages
- Icons for easy identification

### Floating Action Button
- Click the floating apps button (bottom right)
- Opens a dialog with all pages and icons
- Tap any option to navigate instantly

## Troubleshooting

### App shows loading screen
- Verify the web server is running on `localhost:5173` (if you rely on dev server)
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

### Navigation issues
- Refresh the page using Ctrl+R in the WebView
- Check that all backend services are running
- Verify database connectivity

## Dev vs Packaged behavior (important)

- During development the app will attempt to load the web UI from a local dev server at `http://localhost:5173` if it is reachable. This is convenient for iterative frontend development.
- If the dev server is not reachable (for example when running a packaged Release build or the dev server is stopped), the app will automatically fall back to the bundled web build (the `restaurantflow/build/index.html` shipped with the app). This prevents the WebView from displaying the "localhost refused to connect" error to end users.

Notes:
- The fallback assumes the bundled web build is available at a path relative to the app executable: `../restaurantflow/build/index.html`. If your packaging places the web assets elsewhere, update the packaging or adjust the path in the Flutter app code (`lib/main.dart`).
- The app uses a lightweight in-WebView probe to detect whether the dev server is up. If you need a stronger health-check (specific endpoint or TCP probe), we can change that behavior.

## Quick smoke-test instructions

1) Test development-server mode:

```powershell
# In the `restaurantflow/` directory (web app)
npm install
npm run dev

# Then launch the desktop app from IDE or run the built exe
flutter run -d windows
# or start the Release exe from build\windows\x64\runner\Release\admin_manager_app.exe
```

Expected: the app loads pages from `http://localhost:5173` and navigation works.

2) Test packaged fallback mode:

```powershell
# Stop dev server
# Ensure the folder `restaurantflow/build` contains a production build (run below if needed)
cd restaurantflow
npm run build

# Then run the Release exe for the desktop app
& "..\window app\admin_manager_app\build\windows\x64\runner\Release\admin_manager_app.exe"
```

Expected: the app loads the bundled `index.html` from the packaged build and navigation works. If some SPA routes don't resolve when using file://, consider switching the client router to hash mode or packaging a tiny local static server.

If you want, I can update packaging scripts to ensure the web build is copied to the proper location during the Windows release build process.

## Administrative Features

This app has full access to all restaurant management features:
- Real-time order monitoring
- Complete financial management
- Advanced analytics and reporting
- System configuration and settings
- User management capabilities

## Security Note

This app provides full administrative access. Ensure it's only used by authorized personnel.
