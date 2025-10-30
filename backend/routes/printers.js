import express from 'express';
import PrinterService from '../services/PrinterService.js';

const router = express.Router();
const printerService = new PrinterService();

// Get all available printers
router.get('/printers', async (req, res) => {
    try {
        const printers = printerService.getPrinters();
        res.json({
            success: true,
            printers,
            defaultPrinter: printerService.getDefaultPrinter()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get printers',
            error: error.message
        });
    }
});

// Get connected printers (alias for getting all printers)
router.get('/printers/connected', async (req, res) => {
    try {
        const printers = printerService.getPrinters();
        const connectedPrinters = printers.filter(p => p.isConnected || p.isDefault);
        res.json({
            success: true,
            printers: connectedPrinters,
            defaultPrinter: printerService.getDefaultPrinter()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get connected printers',
            error: error.message
        });
    }
});

// Discover/refresh printers (supports both POST /detect and POST /discover)
router.post('/printers/detect', async (req, res) => {
    try {
        const printers = await printerService.refreshPrinters();
        res.json({
            success: true,
            message: `Found ${printers.length} printers`,
            printers,
            defaultPrinter: printerService.getDefaultPrinter()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to detect printers',
            error: error.message
        });
    }
});

// Alias for discover (supports frontend calling /printers/discover)
router.post('/printers/discover', async (req, res) => {
    try {
        const printers = await printerService.refreshPrinters();
        res.json({
            success: true,
            message: `Found ${printers.length} printers`,
            printers,
            defaultPrinter: printerService.getDefaultPrinter()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to discover printers',
            error: error.message
        });
    }
});

// Configure a specific printer
router.post('/printers/:printerId/configure', async (req, res) => {
    try {
        const { printerId } = req.params;
        const config = req.body;

        // Validate configuration
        if (!config) {
            return res.status(400).json({
                success: false,
                message: 'Configuration data is required'
            });
        }

        const result = await printerService.configurePrinter(printerId, config);
        
        res.json({
            success: true,
            message: 'Printer configured successfully',
            printerId,
            config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to configure printer',
            error: error.message
        });
    }
});

// Get printer configuration
router.get('/printers/:printerId/config', (req, res) => {
    try {
        const { printerId } = req.params;
        const config = printerService.getPrinterConfig(printerId);
        
        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Printer configuration not found'
            });
        }

        res.json({
            success: true,
            printerId,
            config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get printer configuration',
            error: error.message
        });
    }
});

// Set default printer
router.post('/printers/:printerId/set-default', (req, res) => {
    try {
        const { printerId } = req.params;
        const result = printerService.setDefaultPrinter(printerId);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Printer not found'
            });
        }

        res.json({
            success: true,
            message: 'Default printer set successfully',
            defaultPrinter: printerService.getDefaultPrinter()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to set default printer',
            error: error.message
        });
    }
});

// Test printer connection
router.post('/printers/:printerId/test', async (req, res) => {
    try {
        const { printerId } = req.params;
        const result = await printerService.testPrinter(printerId);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Test print completed successfully',
                result
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Test print failed',
                error: result.message
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to test printer',
            error: error.message
        });
    }
});

// Print a bill to a specific printer
router.post('/printers/:printerId/print-bill', async (req, res) => {
    try {
        const { printerId } = req.params;
        const { billId, bill, format = 'receipt' } = req.body;

        if (!bill && !billId) {
            return res.status(400).json({
                success: false,
                message: 'Bill data or bill ID is required'
            });
        }

        let billData = bill;
        
        // If billId is provided, fetch the bill from database
        if (billId && !bill) {
            const Bill = (await import('../models/Bill.js')).default;
            billData = await Bill.findById(billId).populate('orders');
            
            if (!billData) {
                return res.status(404).json({
                    success: false,
                    message: 'Bill not found'
                });
            }
        }

        const result = await printerService.printBill(billData, printerId, format);
        
        res.json({
            success: true,
            message: 'Bill printed successfully',
            result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to print bill',
            error: error.message
        });
    }
});

// Print a bill to the default printer
router.post('/print-bill', async (req, res) => {
    try {
        const { billId, bill, format = 'receipt' } = req.body;

        if (!bill && !billId) {
            return res.status(400).json({
                success: false,
                message: 'Bill data or bill ID is required'
            });
        }

        let billData = bill;
        
        // If billId is provided, fetch the bill from database
        if (billId && !bill) {
            const Bill = (await import('../models/Bill.js')).default;
            billData = await Bill.findById(billId).populate('orders');
            
            if (!billData) {
                return res.status(404).json({
                    success: false,
                    message: 'Bill not found'
                });
            }
        }

        const result = await printerService.printBill(billData, null, format);
        
        res.json({
            success: true,
            message: 'Bill printed successfully to default printer',
            result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to print bill',
            error: error.message
        });
    }
});

// Get printer status and health check
router.get('/printers/:printerId/status', async (req, res) => {
    try {
        const { printerId } = req.params;
        const printers = printerService.getPrinters();
        const printer = printers.find(p => p.id === printerId);
        
        if (!printer) {
            return res.status(404).json({
                success: false,
                message: 'Printer not found'
            });
        }

        // Perform a quick status check
        const config = printerService.getPrinterConfig(printerId);
        
        res.json({
            success: true,
            printer,
            config,
            status: 'online', // This could be enhanced with actual status checking
            lastChecked: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get printer status',
            error: error.message
        });
    }
});

// Batch print multiple bills
router.post('/print-bills', async (req, res) => {
    try {
        const { billIds, bills, printerId, format = 'receipt' } = req.body;

        if (!bills && !billIds) {
            return res.status(400).json({
                success: false,
                message: 'Bills data or bill IDs are required'
            });
        }

        let billsData = bills || [];
        
        // If billIds are provided, fetch the bills from database
        if (billIds && billIds.length > 0) {
            const Bill = (await import('../models/Bill.js')).default;
            billsData = await Bill.find({ _id: { $in: billIds } }).populate('orders');
        }

        const results = [];
        const errors = [];

        for (const bill of billsData) {
            try {
                const result = await printerService.printBill(bill, printerId, format);
                results.push({
                    billId: bill._id,
                    billNumber: bill.billNumber,
                    success: true,
                    result
                });
            } catch (error) {
                errors.push({
                    billId: bill._id,
                    billNumber: bill.billNumber,
                    success: false,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Printed ${results.length} bills, ${errors.length} errors`,
            results,
            errors,
            summary: {
                total: billsData.length,
                successful: results.length,
                failed: errors.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to batch print bills',
            error: error.message
        });
    }
});

// Get printer system information
router.get('/system/info', (req, res) => {
    try {
        const info = {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            availablePrinters: printerService.getPrinters().length,
            defaultPrinter: printerService.getDefaultPrinter()?.name || 'None',
            supportedTypes: ['thermal', 'escpos', 'serial', 'network', 'system'],
            supportedFormats: ['receipt', 'a4', 'test']
        };

        res.json({
            success: true,
            info
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get system information',
            error: error.message
        });
    }
});

// Reset printer configurations
router.post('/reset-config', async (req, res) => {
    try {
        // Clear all printer configurations
        printerService.printerConfigs.clear();
        await printerService.savePrinterConfigs();
        
        // Re-detect printers
        const printers = await printerService.refreshPrinters();
        
        res.json({
            success: true,
            message: 'Printer configurations reset and printers re-detected',
            printers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reset printer configurations',
            error: error.message
        });
    }
});

// Export printer configurations
router.get('/export-config', (req, res) => {
    try {
        const configs = Object.fromEntries(printerService.printerConfigs);
        const printers = printerService.getPrinters();
        
        const exportData = {
            timestamp: new Date().toISOString(),
            printers: printers.map(p => ({
                id: p.id,
                name: p.name,
                type: p.type,
                interface: p.interface
            })),
            configurations: configs,
            defaultPrinter: printerService.getDefaultPrinter()?.id
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=printer-config-export.json');
        res.json(exportData);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to export configurations',
            error: error.message
        });
    }
});

// Import printer configurations
router.post('/import-config', async (req, res) => {
    try {
        const { configurations, defaultPrinterId } = req.body;

        if (!configurations) {
            return res.status(400).json({
                success: false,
                message: 'Configurations data is required'
            });
        }

        // Import configurations
        for (const [printerId, config] of Object.entries(configurations)) {
            printerService.printerConfigs.set(printerId, config);
        }

        await printerService.savePrinterConfigs();

        // Set default printer if specified
        if (defaultPrinterId) {
            printerService.setDefaultPrinter(defaultPrinterId);
        }

        res.json({
            success: true,
            message: 'Configurations imported successfully',
            importedCount: Object.keys(configurations).length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to import configurations',
            error: error.message
        });
    }
});

export default router;
