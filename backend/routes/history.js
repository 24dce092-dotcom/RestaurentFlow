import express from 'express';
import Bill from '../models/Bill.js';
import Payment from '../models/Payment.js';

const router = express.Router();

// GET /api/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=100
// Returns a merged, de-duplicated list of bills and payments (payments-derived when bill missing)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, limit = 200 } = req.query;

    const candidates = [];

    // Build date range filters if provided
    const qBill = {};
    const qPayment = {};
    if (startDate) {
      const sd = new Date(startDate);
      if (!isNaN(sd)) {
        qBill.createdAt = { ...(qBill.createdAt || {}), $gte: sd };
        qPayment.timestamp = { ...(qPayment.timestamp || {}), $gte: sd };
      }
    }
    if (endDate) {
      const ed = new Date(endDate);
      if (!isNaN(ed)) {
        // include entire day
        ed.setHours(23,59,59,999);
        qBill.createdAt = { ...(qBill.createdAt || {}), $lte: ed };
        qPayment.timestamp = { ...(qPayment.timestamp || {}), $lte: ed };
      }
    }

    // Fetch bills and payments in parallel
    const [bills, payments] = await Promise.all([
      Bill.find(qBill).lean().exec(),
      Payment.find(qPayment).lean().exec()
    ]);

    // Map bills by id for dedup
    const billById = new Map();
    (bills || []).forEach(b => {
      billById.set(String(b._id), b);
    });

    const merged = [];

    // Start with bills (prefer canonical bill records)
    (bills || []).forEach(b => {
      merged.push({
        id: b._id,
        billNumber: b.billNumber || `B-${String(b._id).slice(-6)}`,
        tableNumber: b.tableNumber,
        date: b.createdAt || b._id.getTimestamp?.() || new Date(),
        amount: Number(b.totalAmount) || 0,
        status: b.status || 'pending',
        items: b.items || [],
        source: 'bill'
      });
    });

    // Add payments that don't have a matching bill or augment existing ones
    (payments || []).forEach(p => {
      const bid = p.billId ? String(p.billId) : null;
      if (bid && billById.has(bid)) {
        // Optionally attach payment summary to existing bill entry
        // For now we skip adding a duplicate entry; client can fetch payments by bill
        return;
      }

      const d = p.timestamp ? new Date(p.timestamp) : new Date(p.createdAt || p.date || Date.now());
      merged.push({
        id: p._id,
        billNumber: p.reference || `PAY-${(d.getTime().toString()).slice(-6)}`,
        tableNumber: p.tableNumber || p.table || null,
        date: d,
        amount: Number(p.amount) || 0,
        status: p.status || 'completed',
        items: [],
        source: 'payment'
      });
    });

    // Sort descending by date
    merged.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Limit
    const out = merged.slice(0, Number(limit));
    res.json(out);
  } catch (err) {
    console.error('Failed to load history:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
