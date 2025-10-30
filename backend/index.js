import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env if present
dotenv.config();

const app = express();
app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));



// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurantflow';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
// Import models from models/ so we don't redeclare them here
import Table from './models/table.js';
import Bill from './models/Bill.js';
import Order from './models/Order.js';
import MenuItem from './models/MenuItem.js';
// role middleware removed - endpoints are open

// Ensure indexes are synced (useful after creating sparse unique index on customId)
try {
  MenuItem.syncIndexes().then(() => console.log('MenuItem indexes synced')).catch(err => console.warn('Failed to sync MenuItem indexes:', err && err.message));
} catch (e) {}


// CRUD endpoints for Table
app.get('/api/tables', async (req, res) => {
  try {
    // Fetch tables and annotate 'running' when there's a pending bill for the table
    const tables = await Table.find().lean();
    // Find table numbers that have pending bills
    const pending = await Bill.aggregate([
      { $match: { status: 'pending', tableNumber: { $ne: null } } },
      { $group: { _id: '$tableNumber' } }
    ]).exec();
    const runningSet = new Set((pending || []).map(p => Number(p._id)));
    // Also consider active orders (orders that are not billed/completed/cancelled)
    try {
      const activeOrders = await Order.find({ status: { $nin: ['billed', 'completed', 'cancelled'] } }).populate('table').lean().exec();
      (activeOrders || []).forEach(o => {
        const tbl = o?.table;
        const num = tbl?.number || o?.tableNumber || null;
        if (num != null) runningSet.add(Number(num));
      });
    } catch (err) {
      // if orders lookup fails, continue with bills-only annotation
      console.warn('Failed to include orders in running-set:', err && err.message);
    }
    const annotated = (tables || []).map(t => {
      const num = t.number || t.tableNumber || null;
      if (num != null && runningSet.has(Number(num))) {
        return { ...t, status: 'running' };
      }
      return t;
    });
    res.json(annotated);
  } catch (err) {
    console.error('Failed to fetch tables with running annotation:', err);
    const tables = await Table.find();
    res.json(tables);
  }
});

app.post('/api/tables', async (req, res) => {
  const table = new Table(req.body);
  await table.save();
  res.status(201).json(table);
});

app.put('/api/tables/:id', async (req, res) => {
  const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(table);
});

app.delete('/api/tables/:id', async (req, res) => {
  await Table.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// CRUD endpoints for MenuItem
app.get('/api/menu-items', async (req, res) => {
  const items = await MenuItem.find();
  res.json(items);
});

app.post('/api/menu-items', async (req, res) => {
  try {
    const payload = { ...req.body };
    // If customId is not provided, assign next numeric customId (start at 100)
    if (payload.customId === undefined || payload.customId === null || payload.customId === '') {
      const maxDoc = await MenuItem.find({ customId: { $ne: null } }).sort({ customId: -1 }).limit(1).lean();
      let next = 100;
      if (maxDoc && maxDoc.length > 0 && typeof maxDoc[0].customId === 'number') {
        next = Math.max(next, maxDoc[0].customId + 1);
      }
      payload.customId = next;
    } else {
      // ensure numeric
      const parsed = Number(payload.customId);
      payload.customId = Number.isFinite(parsed) ? parsed : null;
    }

    const item = new MenuItem(payload);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    console.error('Failed to create menu item', err);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// PUT /api/menu-items/:id
app.put('/api/menu-items/:id', async (req, res) => {
  try {
    console.log('Incoming menu update for id', req.params.id, 'body=', req.body);
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    console.log('Original item before update:', {
      name: item.name,
      allowHalf: item.allowHalf,
      halfPrice: item.halfPrice,
      available: item.available
    });

    // Apply allowed fields explicitly to avoid accidental overwrites
    if (req.body.name !== undefined) item.name = req.body.name;
    if (req.body.category !== undefined) item.category = req.body.category;
    if (req.body.price !== undefined) item.price = Number(req.body.price);
    if (req.body.available !== undefined) item.available = !!req.body.available;
    
    // Half-plate flags - always update these fields
    item.allowHalf = !!req.body.allowHalf;
    console.log('Setting allowHalf to:', !!req.body.allowHalf, 'from req.body.allowHalf:', req.body.allowHalf);
    
    if (req.body.halfPrice !== undefined) {
      if (req.body.halfPrice === null || req.body.halfPrice === '') {
        item.halfPrice = undefined;
      } else {
        item.halfPrice = Number(req.body.halfPrice);
      }
      console.log('Setting halfPrice to:', item.halfPrice, 'from req.body.halfPrice:', req.body.halfPrice);
    }
    // Accept customId updates (convert to Number when provided)
    if (req.body.customId !== undefined) {
      const parsed = Number(req.body.customId);
      item.customId = Number.isFinite(parsed) ? parsed : null;
    }

    console.log('Item before save:', {
      name: item.name,
      allowHalf: item.allowHalf,
      halfPrice: item.halfPrice,
      available: item.available
    });

    await item.save();
    console.log('Successfully saved menu item:', {
      id: item._id,
      name: item.name,
      allowHalf: item.allowHalf,
      halfPrice: item.halfPrice,
      available: item.available
    });
    res.json(item);
  } catch (err) {
    console.error('Menu item update failed', err);
    res.status(500).json({ error: 'Failed to update item', details: err.message });
  }
});

// DELETE /api/menu-items/:id
app.delete('/api/menu-items/:id', async (req, res) => {
  await MenuItem.findByIdAndDelete(req.params.id);
  res.status(204).end();
});



// Orders route
import ordersRouter from './routes/orders.js';
app.use('/api/orders', ordersRouter);

// Bills route
import billsRouter from './routes/bills.js';
app.use('/api/bills', billsRouter);

// Payments route
import paymentsRouter from './routes/payments.js';
app.use('/api/payments', paymentsRouter);

// Email route
import emailRouter from './routes/email.js';
app.use('/api', emailRouter);

// History route (merged bills + payments)
import historyRouter from './routes/history.js';
app.use('/api/history', historyRouter);

// Settings related routes (Bill Template)
import billTemplateRouter from './routes/billTemplate.js';
app.use('/api/bill-template', billTemplateRouter);

// Printer routes
import printersRouter from './routes/printers.js';
app.use('/api', printersRouter);
// Auto print routes
import autoPrintRouter from './routes/autoPrint.js';
app.use('/api', autoPrintRouter);

// Health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

// Dev-only debug helpers
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/debug/seed-pending-bill', async (req, res) => {
    try {
      const { tableNumber, items, waiterName, totalAmount } = req.body || {};
      const tnum = Number(tableNumber) || 1;
      const its = Array.isArray(items) && items.length > 0 ? items : [{ name: 'Debug Item', price: 1, quantity: 1 }];
      const computedTotal = (totalAmount != null) ? Number(totalAmount) : its.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 1)), 0);
      const bill = new Bill({ orders: [], tableNumber: tnum, waiterName: waiterName || 'dev', items: its, totalAmount: computedTotal, status: 'pending', billNumber: `DBG-${Date.now()}` });
      await bill.save();
      res.status(201).json(bill);
    } catch (err) {
      console.error('Failed to create debug bill:', err);
      res.status(500).json({ error: err.message });
    }
  });
}

// Serve built frontend (SPA) so LAN/mobile can access the app via backend port
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Path to the built frontend output (Vite build goes to restaurantflow/build)
  const frontendBuildPath = path.resolve(__dirname, '../restaurantflow/build');
  app.use(express.static(frontendBuildPath));
  // SPA fallback for any non-API route
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/healthz') return next();
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} catch (e) {
  console.warn('Static frontend serving disabled:', e && e.message);
}

const explicitPortSet = !!process.env.PORT;
const BASE_PORT = Number(process.env.PORT) || 5001;
const MAX_TRIES = 10;

function startServerAuto(tryPort, triesLeft) {
  const server = app.listen(tryPort, '0.0.0.0', () => {
    console.log(`Backend running on port ${tryPort}`);
  });
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      if (!explicitPortSet && triesLeft > 0) {
        const nextPort = tryPort + 1;
        console.warn(`Port ${tryPort} is in use, trying ${nextPort}...`);
        startServerAuto(nextPort, triesLeft - 1);
        return;
      }
    }
    console.error('Server listen error:', err);
    process.exit(1);
  });
}

// Bind to all network interfaces to allow access from any device on the same network
startServerAuto(BASE_PORT, MAX_TRIES);
