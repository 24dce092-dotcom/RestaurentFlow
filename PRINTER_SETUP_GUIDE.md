# Printer Setup Guide for Restaurant Flow

This guide will help you set up various types of printers with the Restaurant Flow POS system. The system supports thermal printers, regular system printers, network printers, USB printers, and serial printers.

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Supported Printer Types](#supported-printer-types)
3. [Quick Setup](#quick-setup)
4. [Thermal Printer Setup](#thermal-printer-setup)
5. [Network Printer Setup](#network-printer-setup)
6. [USB Printer Setup](#usb-printer-setup)
7. [System Printer Setup](#system-printer-setup)
8. [Serial Printer Setup](#serial-printer-setup)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

## System Requirements

### Windows
- Windows 10 or later
- Node.js 18.0 or later
- Administrator privileges for printer installation

### Linux/macOS
- Ubuntu 20.04+ / macOS 10.15+
- Node.js 18.0 or later
- CUPS printing system (usually pre-installed)
- sudo privileges for printer configuration

## Supported Printer Types

### ✅ Thermal Printers
- **ESC/POS compatible thermal printers**
- Epson TM series (TM-T20, TM-T88, etc.)
- Star TSP series
- Generic thermal receipt printers
- **Paper Width**: 58mm, 80mm
- **Connection**: USB, Serial, Network

### ✅ Network Printers
- Any network-enabled printer
- IP-based printing (Raw TCP/IP)
- Common ports: 9100 (Raw), 515 (LPD), 631 (IPP)

### ✅ System Printers
- Windows system printers
- CUPS printers (Linux/macOS)
- PDF virtual printers
- Local and shared printers

### ✅ USB Printers
- Any USB-connected printer
- Automatic device detection
- Plug-and-play support

### ✅ Serial Printers
- RS-232 serial printers
- USB-to-Serial adapters
- Configurable baud rates

## Quick Setup

### 1. Start the Backend Server
```bash
cd backend
npm start
```

### 2. Detect Printers
Make a POST request to detect all available printers:
```bash
curl -X POST http://localhost:5001/api/printers/detect
```

### 3. Test Printer
Test any detected printer:
```bash
curl -X POST http://localhost:5001/api/printers/{PRINTER_ID}/test
```

### 4. Set Default Printer
```bash
curl -X POST http://localhost:5001/api/printers/{PRINTER_ID}/set-default
```

### 5. Print a Bill
```bash
curl -X POST http://localhost:5001/api/print-bill \
  -H "Content-Type: application/json" \
  -d '{"billId": "BILL_ID_HERE"}'
```

## Thermal Printer Setup

### Step 1: Physical Connection
1. **USB Connection**: Connect the printer via USB cable
2. **Network Connection**: Connect to your network and note the IP address
3. **Serial Connection**: Connect via RS-232 or USB-to-Serial adapter

### Step 2: Driver Installation (Windows)
1. Download drivers from manufacturer's website
2. Install the printer driver
3. Test print from Windows printer settings

### Step 3: Configure in Restaurant Flow
```javascript
// Example configuration
const config = {
  width: 48,           // Characters per line (58mm = 32, 80mm = 48)
  characterSet: "SLOVENIA",
  lineCharacter: "=",
  timeout: 5000
};

// Configure via API
fetch('/api/printers/thermal_epson_usb/configure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(config)
});
```

### Step 4: Test Printing
```bash
curl -X POST http://localhost:5001/api/printers/thermal_epson_usb/test
```

### Common Thermal Printer Models

#### Epson TM-T20III
- **Width**: 80mm (48 characters)
- **Interface**: USB, Serial, Ethernet
- **Driver**: Download from Epson website

#### Epson TM-T88V
- **Width**: 80mm (48 characters)
- **Interface**: USB, Serial, Ethernet, Parallel
- **Driver**: Download from Epson website

#### Star TSP143III
- **Width**: 80mm (48 characters)
- **Interface**: USB, Ethernet, WiFi, Bluetooth
- **Driver**: Download from Star Micronics website

## Network Printer Setup

### Step 1: Find Printer IP Address
1. Print a network configuration page from the printer
2. Check your router's connected devices list
3. Use network scanning tools

### Step 2: Test Network Connectivity
```bash
# Test if printer responds on port 9100 (Raw printing)
telnet PRINTER_IP 9100

# Test if printer responds on port 515 (LPD)
telnet PRINTER_IP 515
```

### Step 3: Configure in Restaurant Flow
The system will automatically detect network printers on common ports. You can also manually configure:

```javascript
const networkConfig = {
  host: "192.168.1.100",
  port: 9100,
  timeout: 5000
};
```

### Step 4: Test Network Printing
```bash
curl -X POST http://localhost:5001/api/printers/network_192.168.1.100_9100/test
```

## USB Printer Setup

### Windows USB Setup
1. Connect the printer via USB
2. Windows should automatically detect and install drivers
3. If not, download drivers from manufacturer's website
4. Verify in "Devices and Printers" control panel

### Linux USB Setup
```bash
# Check if printer is detected
lsusb

# Install printer drivers (example for Brother)
sudo apt-get install printer-driver-brlaser

# Add printer via CUPS
sudo lpadmin -p USBPrinter -E -v usb://Brother/HL-L2350DW -m brother-hl-l2350dw-cups-en.ppd
```

### macOS USB Setup
1. Connect the printer via USB
2. Go to System Preferences > Printers & Scanners
3. Click "+" to add the printer
4. Select the USB-connected printer

## System Printer Setup

### Windows System Printers
Restaurant Flow will automatically detect all installed Windows printers. To manually install:

1. Go to Settings > Devices > Printers & Scanners
2. Click "Add a printer or scanner"
3. Select your printer and follow the setup wizard
4. Test print from Windows

### Linux/macOS System Printers
```bash
# List available printers
lpstat -p

# Add a new printer
sudo lpadmin -p PrinterName -E -v ipp://printer-ip/ipp/print -m everywhere

# Set as default
lpoptions -d PrinterName

# Test print
echo "Test print" | lp -d PrinterName
```

## Serial Printer Setup

### Step 1: Identify Serial Port
#### Windows
1. Open Device Manager
2. Expand "Ports (COM & LPT)"
3. Note the COM port number (e.g., COM1, COM3)

#### Linux
```bash
# List serial ports
ls /dev/ttyS* /dev/ttyUSB*

# Check for USB-to-Serial adapters
dmesg | grep tty
```

#### macOS
```bash
# List serial ports
ls /dev/tty.*
```

### Step 2: Configure Serial Settings
Common serial printer settings:
- **Baud Rate**: 9600, 19200, 38400, or 115200
- **Data Bits**: 8
- **Parity**: None
- **Stop Bits**: 1
- **Flow Control**: None

### Step 3: Test Serial Communication
#### Windows
```bash
# Using PowerShell
$port = new-Object System.IO.Ports.SerialPort COM1,9600,None,8,one
$port.Open()
$port.WriteLine("Test print")
$port.Close()
```

#### Linux/macOS
```bash
# Test communication
echo "Test print" > /dev/ttyUSB0
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: Printer Not Detected
**Solutions:**
1. Check physical connections
2. Verify printer is powered on
3. Restart the printer
4. Restart the Restaurant Flow backend
5. Check Windows Device Manager for driver issues

#### Issue: "Printer Not Connected" Error
**Solutions:**
1. For USB printers: Try a different USB port
2. For network printers: Check IP address and port
3. For thermal printers: Verify ESC/POS compatibility
4. Check printer status lights for errors

#### Issue: Garbled Text or Incorrect Formatting
**Solutions:**
1. Check character set configuration
2. Verify printer paper width setting
3. Test with different templates (receipt, a4, kitchen)
4. Check if printer supports the command set being used

#### Issue: Network Printer Timeout
**Solutions:**
1. Verify network connectivity: `ping PRINTER_IP`
2. Check firewall settings
3. Try different network ports (9100, 515, 631)
4. Increase timeout value in configuration

#### Issue: Permission Denied (Linux/macOS)
**Solutions:**
```bash
# Add user to lp group
sudo usermod -a -G lp $USER

# For serial ports, add to dialout group
sudo usermod -a -G dialout $USER

# Restart session or reboot
```

#### Issue: Serial Port Access Denied (Windows)
**Solutions:**
1. Close any other applications using the COM port
2. Run Restaurant Flow as Administrator
3. Check COM port settings in Device Manager

### Printer-Specific Troubleshooting

#### Epson Thermal Printers
- **Black mark detection**: Disable in printer settings if using continuous paper
- **Cut settings**: Configure full cut vs partial cut
- **Font settings**: Use built-in fonts for better compatibility

#### Star Thermal Printers
- **Emulation mode**: Set to ESC/POS mode
- **Interface settings**: Match baud rate and communication settings
- **Paper settings**: Configure for your paper type

#### Network Printers
- **Subnet issues**: Ensure printer and server are on same subnet
- **DHCP**: Consider setting static IP for printer
- **Protocol support**: Check if printer supports Raw TCP/IP printing

### Debug Mode

Enable debug logging by setting environment variable:
```bash
# Windows
set DEBUG=printer:*
npm start

# Linux/macOS
DEBUG=printer:* npm start
```

### Testing API Endpoints

#### Get All Printers
```bash
curl http://localhost:5001/api/printers
```

#### Detect Printers
```bash
curl -X POST http://localhost:5001/api/printers/detect
```

#### Get Printer Status
```bash
curl http://localhost:5001/api/printers/{PRINTER_ID}/status
```

#### Print Test Page
```bash
curl -X POST http://localhost:5001/api/printers/{PRINTER_ID}/test
```

#### Configure Printer
```bash
curl -X POST http://localhost:5001/api/printers/{PRINTER_ID}/configure \
  -H "Content-Type: application/json" \
  -d '{"width": 48, "timeout": 5000}'
```

## API Reference

### Endpoints

#### (New) Auto Print Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/auto-print/config | Fetch auto print configuration |
| PUT | /api/auto-print/config | Update configuration (send full/partial JSON) |
| GET | /api/auto-print/status | Retrieve runtime stats (jobs, success, failures) |
| POST | /api/auto-print/test | Enqueue a synthetic test print job |
| GET | /api/auto-print/printers | Helper list of printers for UI selection |
| GET | /api/auto-print/health | Lightweight combined health + stats summary |

Example update body:
```json
{
  "enabled": true,
  "triggers": ["bill_created", "bill_paid"],
  "targets": {
    "receipt": { "printerId": "thermal_EPSON_usb", "format": "receipt", "active": true },
    "kitchen": { "printerId": "thermal_STAR_usb", "format": "kitchen", "active": true },
    "backup": { "printerId": null, "format": "receipt", "active": false }
  },
  "retry": { "attempts": 3, "delayMs": 1500, "backoffFactor": 2 }
}
```

#### Auto Print Health Endpoint

The `/api/auto-print/health` endpoint returns a concise snapshot combining configuration and live statistics suitable for a small UI badge or monitoring poll.

Response shape:
```json
{
  "success": true,
  "health": {
    "enabled": true,
    "triggers": ["bill_created", "bill_paid"],
    "activeTargets": [
      { "role": "receipt", "printerId": "thermal_EPSON_usb", "format": "receipt" }
    ],
    "queueLength": 0,
    "totalJobs": 12,
    "successful": 11,
    "failed": 1,
    "retried": 1,
    "lastJobAt": "2025-01-14T10:22:33.456Z",
    "lastError": null,
    "timestamp": "2025-01-14T10:22:34.001Z"
  }
}
```

#### UI Status Badge

A lightweight React component `AutoPrintStatusBadge` has been added (fixed bottom-right) that polls `/api/auto-print/health` every ~12s and displays:
- ON/OFF (enabled state)
- Queue length (Q#)
- Failed job count (F# when > 0)
- Hover tooltip with detailed metrics and last error

To remove or relocate it, edit `src/App.jsx` or move the component into your layout shell. Poll interval can be customized via `pollMs` prop.

#### GET /api/printers
Get all available printers
```json
{
  "success": true,
  "printers": [
    {
      "id": "thermal_epson_usb",
      "name": "Epson TM-T88V",
      "type": "thermal",
      "interface": "usb",
      "status": "ready"
    }
  ],
  "defaultPrinter": { ... }
}
```

#### POST /api/printers/detect
Refresh and detect all printers
```json
{
  "success": true,
  "message": "Found 3 printers",
  "printers": [ ... ]
}
```

#### POST /api/printers/{id}/test
Test printer connection
```json
{
  "success": true,
  "message": "Test print sent successfully"
}
```

#### POST /api/printers/{id}/configure
Configure printer settings
```json
{
  "width": 48,
  "characterSet": "SLOVENIA",
  "timeout": 5000
}
```

#### POST /api/print-bill
Print bill to default printer
```json
{
  "billId": "bill_id_here",
  "format": "receipt"
}
```

#### POST /api/printers/{id}/print-bill
Print bill to specific printer
```json
{
  "billId": "bill_id_here",
  "format": "receipt"
}
```

### Print Formats

#### receipt
- Width: 48 characters (80mm paper) or 32 characters (58mm paper)
- Optimized for thermal printers
- Compact layout with essential information

#### a4
- Width: 80 characters
- Full-page format for regular printers
- Detailed layout with complete information

#### kitchen
- Width: 40 characters
- Kitchen-focused layout
- Shows only items and customizations, no prices

### Configuration Options

```javascript
{
  "width": 48,                    // Characters per line
  "characterSet": "SLOVENIA",     // Character encoding
  "lineCharacter": "=",           // Line separator character
  "timeout": 5000,                // Connection timeout (ms)
  "currency": "USD",              // Currency format
  "dateFormat": "locale",         // Date formatting
  "showPrices": true,             // Show prices on kitchen receipts
  "customHeader": "",             // Custom header text
  "customFooter": ""              // Custom footer text
}
```

## Advanced Configuration

### Custom Print Templates

You can create custom print templates by modifying the BillFormattingService:

```javascript
import BillFormattingService from './services/BillFormattingService.js';

const formatter = new BillFormattingService();

// Create custom template
const customTemplate = {
  width: 40,
  header: {
    showLogo: false,
    showRestaurantName: true,
    showAddress: false
  },
  items: {
    showCustomizations: true,
    showPortion: false
  },
  footer: {
    showThankYou: true,
    customMessage: "Visit us again!"
  }
};

formatter.setTemplate('custom', customTemplate);
```

### Multi-Printer Setup

For restaurants with multiple printers (e.g., one for receipts, one for kitchen):

```javascript
// Configure different printers for different purposes
const printerConfig = {
  receipt: 'thermal_epson_usb',
  kitchen: 'thermal_star_usb',
  backup: 'system_printer'
};

// Print to specific printers
await printerService.printBill(bill, printerConfig.receipt, 'receipt');
await printerService.printBill(bill, printerConfig.kitchen, 'kitchen');
```

## Support

If you encounter issues not covered in this guide:

1. Check the server logs for error details
2. Verify your printer model is supported
3. Test with the simplest connection method first (USB)
4. Try printing from other applications to verify printer functionality
5. Check for driver updates from the manufacturer

For additional support, refer to the manufacturer's documentation for your specific printer model.

---

**Note**: This system is designed to work with a wide variety of printers. While we've tested with common models, some specific printer features or proprietary protocols may require additional configuration.
