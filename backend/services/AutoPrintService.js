import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import PrinterService from './PrinterService.js';

/**
 * AutoPrintService
 * Listens for bill lifecycle events and enqueues print jobs according to configuration.
 * Features:
 *  - Enable/disable
 *  - Trigger selection (bill_created, bill_paid, bill_updated)
 *  - Multiple role-based printer targets (receipt, kitchen, backup)
 *  - Retry with backoff
 *  - Persistence of config + basic stats
 */
class AutoPrintService extends EventEmitter {
  constructor() {
    super();
    this.configPath = path.join(process.cwd(), 'auto-print-config.json');
    this.printerService = new PrinterService();
    this.queue = [];
    this.processing = false;
    this.stats = {
      totalJobs: 0,
      successful: 0,
      failed: 0,
      retried: 0,
      lastJobAt: null,
      lastError: null
    };
    this.defaultConfig = {
      enabled: false,
      triggers: ['bill_created'],
      targets: {
        receipt: { printerId: null, format: 'receipt', active: true },
        kitchen: { printerId: null, format: 'kitchen', active: false },
        backup: { printerId: null, format: 'receipt', active: false }
      },
      retry: { attempts: 3, delayMs: 1500, backoffFactor: 2 },
      concurrency: 1,
      queueMax: 200,
      auditLog: true
    };
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return { ...this.defaultConfig, ...data, targets: { ...this.defaultConfig.targets, ...(data.targets || {}) } };
      }
    } catch (e) {
      console.warn('Failed to load auto print config:', e.message);
    }
    return { ...this.defaultConfig };
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (e) {
      console.warn('Failed to save auto print config:', e.message);
    }
  }

  getConfig() { return this.config; }
  updateConfig(patch) {
    this.config = { ...this.config, ...patch };
    if (patch.targets) {
      this.config.targets = { ...this.defaultConfig.targets, ...patch.targets };
    }
    this.saveConfig();
    return this.config;
  }

  getStats() { return this.stats; }

  onBillEvent(eventType, bill) {
    if (!this.config.enabled) return;
    if (!this.config.triggers.includes(eventType)) return;

    const targets = Object.entries(this.config.targets)
      .filter(([_, t]) => t && t.active)
      .map(([role, t]) => ({ role, ...t }));

    targets.forEach(target => {
      this.enqueuePrint({
        bill: bill.toObject ? bill.toObject() : bill,
        eventType,
        targetRole: target.role,
        printerId: target.printerId,
        format: target.format,
        attempt: 1,
        createdAt: Date.now()
      });
    });
  }

  enqueuePrint(job) {
    if (this.queue.length >= this.config.queueMax) {
      this.stats.failed++;
      this.stats.lastError = 'Queue full, dropping job';
      return;
    }
    this.queue.push(job);
    this.stats.totalJobs++;
    this.processQueue();
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length) {
        const job = this.queue.shift();
        await this.executeJob(job);
        await this.delay(150); // slight pacing
      }
    } finally {
      this.processing = false;
    }
  }

  async executeJob(job) {
    const { bill, printerId, format, attempt } = job;
    this.stats.lastJobAt = new Date().toISOString();
    try {
      await this.printerService.refreshPrinters(); // ensure printers list fresh (could optimize)
      await this.printerService.printBill(bill, printerId, format);
      this.stats.successful++;
      this.emit('jobSuccess', job);
    } catch (err) {
      this.stats.failed++;
      this.stats.lastError = err.message;
      this.emit('jobFailure', { job, error: err });
      if (attempt < this.config.retry.attempts) {
        const nextDelay = this.config.retry.delayMs * Math.pow(this.config.retry.backoffFactor, attempt - 1);
        this.stats.retried++;
        setTimeout(() => {
          this.enqueuePrint({ ...job, attempt: attempt + 1 });
        }, nextDelay);
      }
    }
  }

  delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// Singleton export
const autoPrintService = new AutoPrintService();
export default autoPrintService;