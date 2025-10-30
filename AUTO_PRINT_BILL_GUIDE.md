# Auto Print Bill Configuration Guide

This guide explains how to configure automatic bill printing in Restaurant Flow POS system.

## Overview

Auto print functionality allows bills to be automatically printed when:
- A bill is created from an order
- A bill is marked as paid
- An order is completed
- Custom triggers are defined

## Configuration Options

### 1. Basic Auto Print Setup

#### Enable Auto Print on Bill Creation
```javascript
// In your frontend or configuration
const autoPrintConfig = {
  enabled: true,
  printOnBillCreate: true,
  printOnPayment: false,
  defaultPrinter: "thermal_epson_usb",
  defaultFormat: "receipt"
};
```

#### API Configuration
```bash
# Enable auto print for a specific printer
curl -X POST http://localhost:5001/api/printers/thermal_epson_usb/configure \
  -H "Content-Type: application/json" \
  -d '{
    "autoPrint": {
      "enabled": true,
      "triggers": ["bill_created", "bill_paid"],
      "format": "receipt"
    }
  }'
```

### 2. Frontend Integration

#### React Component Example
```jsx
import React, { useState } from 'react';

const AutoPrintSettings = () => {
  const [autoPrint, setAutoPrint] = useState({
    enabled: false,
    printOnCreate: true,
    printOnPayment: false,
    printerId: '',
    format: 'receipt'
  });

  const handleSave = async () => {
    try {
      const response = await fetch('/api/auto-print/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoPrint)
      });

      if (response.ok) {
        alert('Auto print settings saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save auto print settings:', error);
    }
  };

  return (
    <div className="auto-print-settings">
      <h3>Auto Print Configuration</h3>
      
      <label>
        <input
          type="checkbox"
          checked={autoPrint.enabled}
          onChange={(e) => setAutoPrint({...autoPrint, enabled: e.target.checked})}
        />
        Enable Auto Print
      </label>

      <label>
        <input
          type="checkbox"
          checked={autoPrint.printOnCreate}
          onChange={(e) => setAutoPrint({...autoPrint, printOnCreate: e.target.checked})}
        />
        Print when bill is created
      </label>

      <label>
        <input
          type="checkbox"
          checked={autoPrint.printOnPayment}
          onChange={(e) => setAutoPrint({...autoPrint, printOnPayment: e.target.checked})}
        />
        Print when bill is paid
      </label>

      <select
        value={autoPrint.format}
        onChange={(e) => setAutoPrint({...autoPrint, format: e.target.value})}
      >
        <option value="receipt">Receipt</option>
        <option value="a4">A4</option>
        <option value="kitchen">Kitchen</option>
      </select>

      <button onClick={handleSave}>Save Settings</button>
    </div>
  );
};
```

### 3. Backend Auto Print Service

Create an auto print service to handle automatic printing:

```javascript
// services/AutoPrintService.js
import PrinterService from './PrinterService.js';

class AutoPrintService {
  constructor() {
    this.printerService = new PrinterService();
    this.config = {
      enabled: false,
      triggers: [],
      defaultPrinter: null,
      defaultFormat: 'receipt',
      retryAttempts: 3,
      retryDelay: 1000
    };
  }

  configure(config) {
    this.config = { ...this.config, ...config };
  }

  async handleBillEvent(event, bill) {
    if (!this.config.enabled) return;

    switch (event) {
      case 'bill_created':
        if (this.config.triggers.includes('bill_created')) {
          await this.printBill(bill);
        }
        break;
      
      case 'bill_paid':
        if (this.config.triggers.includes('bill_paid')) {
          await this.printBill(bill);
        }
        break;
      
      case 'bill_updated':
        if (this.config.triggers.includes('bill_updated')) {
          await this.printBill(bill);
        }
        break;
    }
  }

  async printBill(bill, attempt = 1) {
    try {
      const result = await this.printerService.printBill(
        bill,
        this.config.defaultPrinter,
        this.config.defaultFormat
      );

      console.log(`Auto print successful for bill ${bill.billNumber}:`, result);
      return result;
    } catch (error) {
      console.error(`Auto print failed for bill ${bill.billNumber} (attempt ${attempt}):`, error);

      if (attempt < this.config.retryAttempts) {
        setTimeout(() => {
          this.printBill(bill, attempt + 1);
        }, this.config.retryDelay * attempt);
      } else {
        console.error(`Auto print failed permanently for bill ${bill.billNumber}`);
      }
    }
  }
}

export default AutoPrintService;
```

### 4. Integrate Auto Print with Bills Route

Update the bills route to trigger auto printing:

```javascript
// routes/bills.js - Add to existing bill creation
import AutoPrintService from '../services/AutoPrintService.js';

const autoPrintService = new AutoPrintService();

// In the bill creation endpoint
router.post('/', async (req, res) => {
  try {
    // ... existing bill creation logic ...

    const bill = new Bill({
      orders: [order._id],
      tableNumber,
      waiterName: order.waiterName,
      items,
      totalAmount: orderTotal,
      billNumber: newBillNumber,
      billSeq: newBillSeq,
      createdAt: new Date()
    });

    await bill.save();

    // Trigger auto print
    await autoPrintService.handleBillEvent('bill_created', bill);

    res.json(bill);
  } catch (err) {
    // ... error handling ...
  }
});

// In the bill payment endpoint
router.patch('/:id', async (req, res) => {
  try {
    // ... existing update logic ...

    if (req.body.status === 'paid') {
      // Trigger auto print on payment
      await autoPrintService.handleBillEvent('bill_paid', bill);
    }

    res.json(bill);
  } catch (err) {
    // ... error handling ...
  }
});
```

### 5. Environment Configuration

Add auto print settings to environment configuration:

```bash
# .env file
AUTO_PRINT_ENABLED=true
AUTO_PRINT_DEFAULT_PRINTER=thermal_epson_usb
AUTO_PRINT_DEFAULT_FORMAT=receipt
AUTO_PRINT_RETRY_ATTEMPTS=3
AUTO_PRINT_RETRY_DELAY=1000
```

```javascript
// Load from environment
const autoPrintConfig = {
  enabled: process.env.AUTO_PRINT_ENABLED === 'true',
  defaultPrinter: process.env.AUTO_PRINT_DEFAULT_PRINTER,
  defaultFormat: process.env.AUTO_PRINT_DEFAULT_FORMAT || 'receipt',
  retryAttempts: parseInt(process.env.AUTO_PRINT_RETRY_ATTEMPTS) || 3,
  retryDelay: parseInt(process.env.AUTO_PRINT_RETRY_DELAY) || 1000
};
```

### 6. Advanced Auto Print Features

#### Conditional Auto Print
```javascript
// Print only for specific table ranges
const shouldAutoPrint = (bill) => {
  const tableNumber = bill.tableNumber;
  
  // Only auto print for tables 1-10
  if (tableNumber >= 1 && tableNumber <= 10) {
    return true;
  }
  
  // Only auto print for bills over $50
  if (bill.totalAmount >= 50) {
    return true;
  }
  
  return false;
};
```

#### Multi-Printer Auto Print
```javascript
// Print receipts to customer printer and kitchen orders to kitchen printer
const multiPrinterConfig = {
  customer: {
    printerId: 'thermal_epson_usb',
    format: 'receipt',
    triggers: ['bill_created', 'bill_paid']
  },
  kitchen: {
    printerId: 'thermal_star_kitchen',
    format: 'kitchen',
    triggers: ['bill_created']
  }
};

// Print to multiple printers
for (const [type, config] of Object.entries(multiPrinterConfig)) {
  if (config.triggers.includes(event)) {
    await this.printerService.printBill(bill, config.printerId, config.format);
  }
}
```

#### Scheduled Auto Print
```javascript
// Print daily summary at end of day
const scheduleEndOfDayPrint = () => {
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const timeUntilEndOfDay = endOfDay.getTime() - now.getTime();

  setTimeout(async () => {
    try {
      const todaysBills = await Bill.find({
        createdAt: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999)
        }
      });

      // Print summary
      const summary = generateDailySummary(todaysBills);
      await this.printerService.printBill(summary, null, 'a4');
      
      // Schedule next day
      scheduleEndOfDayPrint();
    } catch (error) {
      console.error('Failed to print daily summary:', error);
    }
  }, timeUntilEndOfDay);
};
```

### 7. Error Handling and Notifications

#### Auto Print Status Dashboard
```javascript
// Track auto print status
const autoPrintStatus = {
  totalAttempts: 0,
  successfulPrints: 0,
  failedPrints: 0,
  lastPrintTime: null,
  lastError: null
};

// Update status
const updateAutoPrintStatus = (success, error = null) => {
  autoPrintStatus.totalAttempts++;
  autoPrintStatus.lastPrintTime = new Date();
  
  if (success) {
    autoPrintStatus.successfulPrints++;
  } else {
    autoPrintStatus.failedPrints++;
    autoPrintStatus.lastError = error;
  }
};
```

#### Email Notifications for Failed Prints
```javascript
import nodemailer from 'nodemailer';

const sendFailureNotification = async (bill, error) => {
  if (!process.env.NOTIFICATION_EMAIL) return;

  const transporter = nodemailer.createTransporter({
    // Your email configuration
  });

  await transporter.sendMail({
    to: process.env.NOTIFICATION_EMAIL,
    subject: `Auto Print Failed - Bill ${bill.billNumber}`,
    text: `
      Auto print failed for bill ${bill.billNumber}
      Table: ${bill.tableNumber}
      Amount: $${bill.totalAmount}
      Error: ${error.message}
      Time: ${new Date().toLocaleString()}
    `
  });
};
```

### 8. Testing Auto Print

#### Test Auto Print Configuration
```bash
# Test auto print for a specific bill
curl -X POST http://localhost:5001/api/auto-print/test \
  -H "Content-Type: application/json" \
  -d '{"billId": "BILL_ID_HERE"}'
```

#### Simulate Auto Print Events
```javascript
// Test bill creation auto print
const testBill = {
  billNumber: 'TEST-001',
  tableNumber: 5,
  totalAmount: 45.50,
  items: [
    { name: 'Test Item', quantity: 1, price: 45.50 }
  ]
};

await autoPrintService.handleBillEvent('bill_created', testBill);
```

### 9. Troubleshooting Auto Print

#### Common Issues

**Auto Print Not Triggering**
- Check if auto print is enabled in configuration
- Verify printer is set as default
- Check if the correct events are configured as triggers

**Print Queue Backup**
- Implement queue management to prevent overwhelming the printer
- Add delays between multiple print jobs

**Printer Offline During Auto Print**
- Implement fallback to secondary printer
- Queue prints for retry when printer comes back online

#### Debug Auto Print
```javascript
// Enable detailed logging
const debugAutoPrint = true;

if (debugAutoPrint) {
  console.log('Auto print triggered:', {
    event: eventType,
    billId: bill._id,
    billNumber: bill.billNumber,
    printerId: this.config.defaultPrinter,
    timestamp: new Date().toISOString()
  });
}
```

### 10. Performance Considerations

#### Async Auto Print
```javascript
// Don't block bill creation for printing
router.post('/', async (req, res) => {
  try {
    const bill = await createBill(req.body);
    
    // Return response immediately
    res.json(bill);
    
    // Print asynchronously
    setImmediate(() => {
      autoPrintService.handleBillEvent('bill_created', bill);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

#### Print Queue Management
```javascript
class PrintQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async add(printJob) {
    this.queue.push(printJob);
    this.process();
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      try {
        await this.executePrintJob(job);
        await this.delay(500); // Small delay between jobs
      } catch (error) {
        console.error('Print job failed:', error);
      }
    }
    
    this.processing = false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

This comprehensive auto print system ensures reliable, automatic bill printing while providing flexibility for different restaurant workflows and error handling capabilities.
