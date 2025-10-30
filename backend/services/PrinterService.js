import ThermalPrinter, { PrinterTypes } from 'node-thermal-printer';
import { SerialPort } from 'serialport';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync, exec } from 'child_process';
import escpos from 'escpos';

class PrinterService {
    constructor() {
        this.availablePrinters = [];
        this.defaultPrinter = null;
        this.connectedPrinters = new Map();
        this.printerConfigs = new Map();
        this.escposUSB = null;
        this.initializeEscposUSB();
        this.initializePrinters();
    }

    async initializeEscposUSB() {
        try {
            const { default: EscposUSB } = await import('escpos-usb');
            this.escposUSB = EscposUSB;
        } catch (error) {
            console.warn('escpos-usb not available, USB ESC/POS printers will not be supported');
        }
    }

    async initializePrinters() {
        if (process.env.SKIP_PRINTERS === '1') {
            console.warn('Printer initialization skipped due to SKIP_PRINTERS=1');
            return;
        }
        try {
            await this.detectPrinters();
            await this.loadPrinterConfigs();
        } catch (error) {
            console.error('Failed to initialize printers:', error);
        }
    }

    // Detect all available printers (thermal, USB, network, system)
    async detectPrinters() {
        const printers = [];

        try {
            // 1. Detect system printers
            const systemPrinters = await this.getSystemPrinters();
            printers.push(...systemPrinters);

            // 2. Detect thermal printers via USB
            const thermalPrinters = await this.detectThermalPrinters();
            printers.push(...thermalPrinters);

            // 3. Detect ESC/POS printers
            const escPosPrinters = await this.detectESCPOSPrinters();
            printers.push(...escPosPrinters);

            // 4. Detect serial port printers
            const serialPrinters = await this.detectSerialPrinters();
            printers.push(...serialPrinters);

            // 5. Detect network printers
            const networkPrinters = await this.detectNetworkPrinters();
            printers.push(...networkPrinters);

        } catch (error) {
            console.error('Error detecting printers:', error);
        }

        this.availablePrinters = printers;
        if (printers.length > 0 && !this.defaultPrinter) {
            this.defaultPrinter = printers[0];
        }

        return printers;
    }

    // Get system printers using platform-specific commands
    async getSystemPrinters() {
        const printers = [];
        
        try {
            let command;
            if (os.platform() === 'win32') {
                command = 'wmic printer list brief';
            } else if (os.platform() === 'darwin') {
                command = 'lpstat -p';
            } else {
                command = 'lpstat -p';
            }

            const output = execSync(command, { encoding: 'utf8' });
            
            if (os.platform() === 'win32') {
                const lines = output.split('\n').slice(1); // Skip header
                for (const line of lines) {
                    if (line.trim()) {
                        const parts = line.split(/\s+/);
                        if (parts.length >= 2) {
                            printers.push({
                                id: `system_${parts[1]}`,
                                name: parts[1],
                                type: 'system',
                                status: parts[2] || 'Unknown',
                                isDefault: parts[3] === 'TRUE',
                                interface: 'system'
                            });
                        }
                    }
                }
            } else {
                // Unix-like systems
                const lines = output.split('\n');
                for (const line of lines) {
                    if (line.includes('printer') && line.includes('is')) {
                        const name = line.split(' ')[1];
                        printers.push({
                            id: `system_${name}`,
                            name: name,
                            type: 'system',
                            status: line.includes('disabled') ? 'disabled' : 'ready',
                            isDefault: false,
                            interface: 'cups'
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('Could not detect system printers:', error.message);
        }

        return printers;
    }

    // Detect thermal printers
    async detectThermalPrinters() {
        const printers = [];

        try {
            // Common thermal printer interfaces
            const interfaces = [
                PrinterTypes.EPSON,
                PrinterTypes.STAR
            ];

            for (const printerType of interfaces) {
                try {
                    // Try USB connection
                    // We cannot actually verify connection here without blocking; just register potential types
                    printers.push({
                        id: `thermal_${printerType}_usb`,
                        name: `Thermal Printer (${printerType}) - USB`,
                        type: 'thermal',
                        printerType: printerType,
                        interface: 'usb',
                        status: 'potential'
                    });
                } catch (error) {
                    // Printer not available
                }
            }

            // Try to detect specific thermal printer models via USB
            if (process.platform === 'win32') {
                try {
                    const usbDevices = execSync('wmic path Win32_PnPEntity where "Name like \'%printer%\'" get Name', { encoding: 'utf8' });
                    const lines = usbDevices.split('\n');
                    
                    for (const line of lines) {
                        if (line.toLowerCase().includes('thermal') || 
                            line.toLowerCase().includes('receipt') ||
                            line.toLowerCase().includes('pos')) {
                            printers.push({
                                id: `thermal_detected_${Date.now()}`,
                                name: line.trim(),
                                type: 'thermal',
                                interface: 'usb',
                                status: 'detected'
                            });
                        }
                    }
                } catch (error) {
                    console.warn('Could not detect USB thermal printers:', error.message);
                }
            }
        } catch (error) {
            console.warn('Error detecting thermal printers:', error.message);
        }

        return printers;
    }

    // Detect ESC/POS printers
    async detectESCPOSPrinters() {
        const printers = [];

        try {
            // Try to find USB ESC/POS printers only if escposUSB is available
            if (this.escposUSB) {
                const device = new this.escposUSB();
                
                // This is a basic detection - in practice, you'd scan for specific vendor IDs
                printers.push({
                    id: 'escpos_usb',
                    name: 'ESC/POS USB Printer',
                    type: 'escpos',
                    interface: 'usb',
                    status: 'detected'
                });
            }
        } catch (error) {
            console.warn('No ESC/POS USB printers found');
        }

        return printers;
    }

    // Detect serial port printers
    async detectSerialPrinters() {
        const printers = [];

        try {
            const ports = await SerialPort.list();
            
            for (const port of ports) {
                // Look for common printer patterns in port descriptions
                if (port.manufacturer?.toLowerCase().includes('printer') ||
                    port.manufacturer?.toLowerCase().includes('pos') ||
                    port.manufacturer?.toLowerCase().includes('thermal')) {
                    
                    printers.push({
                        id: `serial_${port.path}`,
                        name: `Serial Printer - ${port.path}`,
                        type: 'serial',
                        interface: 'serial',
                        port: port.path,
                        manufacturer: port.manufacturer,
                        status: 'detected'
                    });
                }
            }
        } catch (error) {
            console.warn('Error detecting serial printers:', error.message);
        }

        return printers;
    }

    // Detect network printers
    async detectNetworkPrinters() {
        const printers = [];

        // Common network printer ports
        const commonPorts = [9100, 515, 631]; // Raw, LPD, IPP
        const localIP = this.getLocalIP();
        
        if (!localIP) return printers;

        const networkBase = localIP.substring(0, localIP.lastIndexOf('.'));

        // Note: This is a basic implementation. In production, you might want to use
        // more sophisticated network discovery methods
        try {
            // Check common network printer IPs
            for (let i = 1; i <= 10; i++) {
                const ip = `${networkBase}.${i}`;
                
                for (const port of commonPorts) {
                    try {
                        // This is a simplified check - you'd want to implement proper network scanning
                        printers.push({
                            id: `network_${ip}_${port}`,
                            name: `Network Printer - ${ip}:${port}`,
                            type: 'network',
                            interface: 'network',
                            host: ip,
                            port: port,
                            status: 'detected'
                        });
                    } catch (error) {
                        // Printer not available
                    }
                }
            }
        } catch (error) {
            console.warn('Error detecting network printers:', error.message);
        }

        return printers;
    }

    // Get local IP address
    getLocalIP() {
        const interfaces = os.networkInterfaces();
        
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        
        return null;
    }

    // Load saved printer configurations
    async loadPrinterConfigs() {
        try {
            const configPath = path.join(process.cwd(), 'printer-configs.json');
            
            if (fs.existsSync(configPath)) {
                const configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                
                for (const [id, config] of Object.entries(configs)) {
                    this.printerConfigs.set(id, config);
                }
            }
        } catch (error) {
            console.warn('Could not load printer configurations:', error.message);
        }
    }

    // Save printer configurations
    async savePrinterConfigs() {
        try {
            const configPath = path.join(process.cwd(), 'printer-configs.json');
            const configs = Object.fromEntries(this.printerConfigs);
            
            fs.writeFileSync(configPath, JSON.stringify(configs, null, 2));
        } catch (error) {
            console.error('Could not save printer configurations:', error.message);
        }
    }

    // Configure a printer
    async configurePrinter(printerId, config) {
        this.printerConfigs.set(printerId, {
            ...config,
            lastUpdated: new Date().toISOString()
        });
        
        await this.savePrinterConfigs();
        return true;
    }

    // Set default printer
    setDefaultPrinter(printerId) {
        const printer = this.availablePrinters.find(p => p.id === printerId);
        if (printer) {
            this.defaultPrinter = printer;
            return true;
        }
        return false;
    }

    // Test printer connection
    async testPrinter(printerId) {
        try {
            const printer = this.availablePrinters.find(p => p.id === printerId);
            if (!printer) {
                throw new Error('Printer not found');
            }

            const testContent = this.generateTestPrint();
            const result = await this.printToPrinter(printer, testContent, 'test');
            
            return {
                success: true,
                message: 'Test print sent successfully',
                result
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error: error.stack
            };
        }
    }

    // Generate test print content
    generateTestPrint() {
        return {
            type: 'test',
            content: `
================================
        PRINTER TEST
================================
Date: ${new Date().toLocaleString()}
Restaurant Flow POS System
Printer Test Successful!

This is a test print to verify
your printer is working correctly.

Line 1: Normal text
Line 2: Another line
Line 3: Test complete

================================
            `,
            timestamp: new Date().toISOString()
        };
    }

    // Main print function - handles all printer types
    async printToPrinter(printer, content, format = 'receipt') {
        try {
            switch (printer.type) {
                case 'thermal':
                    return await this.printThermal(printer, content, format);
                case 'escpos':
                    return await this.printESCPOS(printer, content, format);
                case 'serial':
                    return await this.printSerial(printer, content, format);
                case 'network':
                    return await this.printNetwork(printer, content, format);
                case 'system':
                    return await this.printSystem(printer, content, format);
                default:
                    throw new Error(`Unsupported printer type: ${printer.type}`);
            }
        } catch (error) {
            console.error(`Failed to print to ${printer.name}:`, error);
            throw error;
        }
    }

    // Print to thermal printer
    async printThermal(printer, content, format) {
        const config = this.printerConfigs.get(printer.id) || {};
        
        const thermalPrinter = new ThermalPrinter({
            type: printer.printerType || PrinterTypes.EPSON,
            interface: printer.interface === 'usb' ? 'printer:auto' : `printer:${config.printerName || 'auto'}`,
            characterSet: config.characterSet || 'SLOVENIA',
            lineCharacter: config.lineCharacter || '=',
            width: config.width || 48,
            options: {
                timeout: config.timeout || 5000
            }
        });

        const isConnected = await thermalPrinter.isPrinterConnected();
        if (!isConnected) {
            throw new Error('Thermal printer not connected');
        }

        if (content.type === 'test') {
            thermalPrinter.alignCenter();
            thermalPrinter.println('PRINTER TEST');
            thermalPrinter.drawLine();
            thermalPrinter.alignLeft();
            thermalPrinter.println(content.content);
        } else {
            // Format bill for thermal printer
            const formattedContent = this.formatForThermal(content, config);
            thermalPrinter.print(formattedContent);
        }

        thermalPrinter.cut();
        
        try {
            await thermalPrinter.execute();
            return { success: true, message: 'Printed successfully to thermal printer' };
        } catch (error) {
            throw new Error(`Thermal printer execution failed: ${error.message}`);
        }
    }

    // Print to ESC/POS printer
    async printESCPOS(printer, content, format) {
        if (!this.escposUSB) {
            throw new Error('ESC/POS USB printing not available - escpos-usb package not installed');
        }

        return new Promise((resolve, reject) => {
            try {
                const device = new this.escposUSB();
                const options = { encoding: "GB18030" };
                const escposPrinter = new escpos.Printer(device, options);

                device.open(() => {
                    if (content.type === 'test') {
                        escposPrinter
                            .font('a')
                            .align('ct')
                            .style('bu')
                            .size(1, 1)
                            .text('PRINTER TEST')
                            .text('================================')
                            .align('lt')
                            .text(content.content)
                            .cut()
                            .close(() => {
                                resolve({ success: true, message: 'Printed successfully to ESC/POS printer' });
                            });
                    } else {
                        const formattedContent = this.formatForESCPOS(content);
                        escposPrinter
                            .print(formattedContent)
                            .cut()
                            .close(() => {
                                resolve({ success: true, message: 'Printed successfully to ESC/POS printer' });
                            });
                    }
                });
            } catch (error) {
                reject(new Error(`ESC/POS printer failed: ${error.message}`));
            }
        });
    }

    // Print to serial port printer
    async printSerial(printer, content, format) {
        return new Promise((resolve, reject) => {
            const port = new SerialPort({
                path: printer.port,
                baudRate: 9600
            });

            port.on('open', () => {
                const printData = content.type === 'test' ? 
                    content.content : 
                    this.formatForSerial(content);

                port.write(printData, (error) => {
                    if (error) {
                        port.close();
                        reject(new Error(`Serial print failed: ${error.message}`));
                    } else {
                        setTimeout(() => {
                            port.close();
                            resolve({ success: true, message: 'Printed successfully to serial printer' });
                        }, 1000);
                    }
                });
            });

            port.on('error', (error) => {
                reject(new Error(`Serial port error: ${error.message}`));
            });
        });
    }

    // Print to network printer
    async printNetwork(printer, content, format) {
        return new Promise((resolve, reject) => {
            const net = require('net');
            const client = new net.Socket();

            client.connect(printer.port, printer.host, () => {
                const printData = content.type === 'test' ? 
                    content.content : 
                    this.formatForNetwork(content);

                client.write(printData);
                client.end();
                
                resolve({ success: true, message: 'Printed successfully to network printer' });
            });

            client.on('error', (error) => {
                reject(new Error(`Network printer error: ${error.message}`));
            });

            client.setTimeout(5000, () => {
                client.destroy();
                reject(new Error('Network printer timeout'));
            });
        });
    }

    // Print to system printer
    async printSystem(printer, content, format) {
        return new Promise((resolve, reject) => {
            try {
                const printData = content.type === 'test' ? 
                    content.content : 
                    this.formatForSystem(content, format);

                // Create temporary file
                const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.txt`);
                fs.writeFileSync(tempFile, printData);

                let command;
                if (os.platform() === 'win32') {
                    command = `notepad /p "${tempFile}"`;
                } else {
                    command = `lpr -P "${printer.name}" "${tempFile}"`;
                }

                exec(command, (error, stdout, stderr) => {
                    // Clean up temp file
                    try {
                        fs.unlinkSync(tempFile);
                    } catch (e) {
                        console.warn('Could not delete temp file:', e.message);
                    }

                    if (error) {
                        reject(new Error(`System printer error: ${error.message}`));
                    } else {
                        resolve({ success: true, message: 'Printed successfully to system printer' });
                    }
                });
            } catch (error) {
                reject(new Error(`System print preparation failed: ${error.message}`));
            }
        });
    }

    // Format content for thermal printers
    formatForThermal(bill, config = {}) {
        const width = config.width || 48;
        const line = '='.repeat(width);
        
        let output = '';
        
        // Header
        output += this.centerText('RESTAURANT FLOW', width) + '\n';
        output += line + '\n';
        output += `Bill #: ${bill.billNumber || 'N/A'}\n`;
        output += `Table: ${bill.tableNumber}\n`;
        output += `Date: ${new Date(bill.createdAt).toLocaleString()}\n`;
        if (bill.waiterName) {
            output += `Waiter: ${bill.waiterName}\n`;
        }
        output += line + '\n';
        
        // Items
        output += this.formatText('Item', 'Qty', 'Price', width) + '\n';
        output += line + '\n';
        
        for (const item of bill.items) {
            const itemName = this.truncateText(item.name, width - 15);
            const qty = item.quantity.toString();
            const price = `$${item.price.toFixed(2)}`;
            
            output += this.formatText(itemName, qty, price, width) + '\n';
            
            if (item.customizations) {
                output += `  ${this.truncateText(item.customizations, width - 2)}\n`;
            }
        }
        
        output += line + '\n';
        output += this.rightAlign(`Total: $${bill.totalAmount.toFixed(2)}`, width) + '\n';
        output += line + '\n';
        output += this.centerText('Thank you for dining with us!', width) + '\n';
        output += '\n\n\n';
        
        return output;
    }

    // Format content for ESC/POS printers
    formatForESCPOS(bill) {
        // Similar to thermal but with ESC/POS specific formatting
        return this.formatForThermal(bill, { width: 48 });
    }

    // Format content for serial printers
    formatForSerial(bill) {
        return this.formatForThermal(bill, { width: 40 });
    }

    // Format content for network printers
    formatForNetwork(bill) {
        return this.formatForThermal(bill, { width: 48 });
    }

    // Format content for system printers
    formatForSystem(bill, format) {
        if (format === 'a4') {
            return this.formatForA4(bill);
        } else {
            return this.formatForThermal(bill, { width: 80 });
        }
    }

    // Format for A4 paper
    formatForA4(bill) {
        let output = '';
        
        output += '                           RESTAURANT FLOW\n';
        output += '================================================================\n\n';
        
        output += `Bill Number: ${bill.billNumber || 'N/A'}\n`;
        output += `Table Number: ${bill.tableNumber}\n`;
        output += `Date: ${new Date(bill.createdAt).toLocaleString()}\n`;
        if (bill.waiterName) {
            output += `Waiter: ${bill.waiterName}\n`;
        }
        output += '\n';
        
        output += 'Items:\n';
        output += '----------------------------------------------------------------\n';
        output += 'Item Name                          Qty    Unit Price    Total\n';
        output += '----------------------------------------------------------------\n';
        
        for (const item of bill.items) {
            const name = item.name.padEnd(30);
            const qty = item.quantity.toString().padStart(6);
            const unitPrice = `$${(item.price / item.quantity).toFixed(2)}`.padStart(12);
            const total = `$${item.price.toFixed(2)}`.padStart(10);
            
            output += `${name} ${qty} ${unitPrice} ${total}\n`;
            
            if (item.customizations) {
                output += `  Customizations: ${item.customizations}\n`;
            }
        }
        
        output += '----------------------------------------------------------------\n';
        output += `                                          Total: $${bill.totalAmount.toFixed(2)}\n`;
        output += '================================================================\n\n';
        output += '                    Thank you for dining with us!\n';
        
        return output;
    }

    // Helper functions for text formatting
    centerText(text, width) {
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        return ' '.repeat(padding) + text;
    }

    rightAlign(text, width) {
        const padding = Math.max(0, width - text.length);
        return ' '.repeat(padding) + text;
    }

    formatText(left, center, right, width) {
        const centerPos = Math.floor(width / 2);
        const rightPos = width - right.length;
        
        let line = left.padEnd(centerPos - center.length);
        line += center;
        line = line.padEnd(rightPos);
        line += right;
        
        return line.substring(0, width);
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }

    // Public methods for external use
    async refreshPrinters() {
        return await this.detectPrinters();
    }

    getPrinters() {
        return this.availablePrinters;
    }

    getDefaultPrinter() {
        return this.defaultPrinter;
    }

    getPrinterConfig(printerId) {
        return this.printerConfigs.get(printerId);
    }

    // Print a bill using the default printer or specified printer
    async printBill(bill, printerId = null, format = 'receipt') {
        const printer = printerId ?
            this.availablePrinters.find(p => p.id === printerId) :
            this.defaultPrinter;

        if (!printer) {
            throw new Error('No printer available for printing');
        }

        return await this.printToPrinter(printer, bill, format);
    }
}

export default PrinterService;