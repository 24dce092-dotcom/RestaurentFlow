import express from 'express';
import autoPrintService from '../services/AutoPrintService.js';
import PrinterService from '../services/PrinterService.js';

const router = express.Router();
const printerService = new PrinterService();

// Get configuration
router.get('/auto-print/config', (req, res) => {
  res.json({ success: true, config: autoPrintService.getConfig() });
});

// Update configuration
router.put('/auto-print/config', (req, res) => {
  try {
    const config = autoPrintService.updateConfig(req.body || {});
    res.json({ success: true, config });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Get stats
router.get('/auto-print/status', (req, res) => {
  res.json({ success: true, stats: autoPrintService.getStats(), queueLength: autoPrintService.queue.length });
});

// Lightweight health endpoint aggregating config + stats
router.get('/auto-print/health', (req, res) => {
  try {
    const cfg = autoPrintService.getConfig();
    const stats = autoPrintService.getStats();
    res.json({
      success: true,
      health: {
        enabled: !!cfg.enabled,
        triggers: cfg.triggers,
        activeTargets: Object.entries(cfg.targets || {}).filter(([,t])=>t && t.active).map(([k,t])=>({ role: k, printerId: t.printerId, format: t.format })),
        queueLength: autoPrintService.queue.length,
        totalJobs: stats.totalJobs,
        successful: stats.successful,
        failed: stats.failed,
        retried: stats.retried,
        lastJobAt: stats.lastJobAt,
        lastError: stats.lastError,
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Test print using current config (creates a synthetic bill)
router.post('/auto-print/test', async (req, res) => {
  try {
    const now = new Date();
    const bill = {
      _id: 'synthetic',
      billNumber: 'AUTO-TEST-' + now.getTime(),
      tableNumber: 999,
      waiterName: 'AutoPrint Tester',
      createdAt: now.toISOString(),
      items: [
        { name: 'Test Item A', price: 4.5, quantity: 1, portion: 'full' },
        { name: 'Test Item B', price: 3.0, quantity: 2, portion: 'full', customizations: 'No salt' }
      ],
      totalAmount: 10.5,
      status: 'pending'
    };

    // Direct enqueue bypassing triggers
    autoPrintService.enqueuePrint({
      bill,
      eventType: 'manual_test',
      targetRole: 'receipt',
      printerId: autoPrintService.getConfig().targets.receipt.printerId,
      format: autoPrintService.getConfig().targets.receipt.format,
      attempt: 1,
      createdAt: Date.now()
    });

    res.json({ success: true, message: 'Test job enqueued', billNumber: bill.billNumber });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// List printers to help UI configuration
router.get('/auto-print/printers', async (req, res) => {
  try {
    await printerService.refreshPrinters();
    res.json({ success: true, printers: printerService.getPrinters(), defaultPrinter: printerService.getDefaultPrinter() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;