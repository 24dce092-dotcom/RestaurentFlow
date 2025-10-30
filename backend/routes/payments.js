import express from 'express';
import Payment from '../models/Payment.js';
import Bill from '../models/Bill.js';
import Counter from '../models/Counter.js';

const router = express.Router();

// Create a payment record
router.post('/', async (req, res) => {
  try {
    const { billId, tableNumber, method, amount, reference, metadata, items } = req.body;

    // If no billId provided, create a minimal Bill record so payments are always associated with a persistent Bill
    let effectiveBillId = billId;
    if (!effectiveBillId) {
      try {
        // assign a bill number atomically
        const counterId = 'billseq';
        const next = await Counter.findByIdAndUpdate(counterId, { $inc: { seq: 1 } }, { new: true, upsert: true });
  const seq = next.seq || 1;
  const offset = Number(process.env.BILL_SEQ_OFFSET || 0);
  const prefix = process.env.BILL_SEQ_PREFIX || '';
  const finalSeq = seq + offset;
  const billNumber = `${prefix}${finalSeq}`;

        const newBill = new Bill({
          tableNumber: tableNumber || (metadata && metadata.tableNumber) || null,
          items: Array.isArray(items) ? items : [],
          totalAmount: Number(amount) || 0,
          status: 'paid',
          createdAt: new Date(),
          billNumber,
          billSeq: seq
        });
        await newBill.save();
        effectiveBillId = newBill._id;
      } catch (e) {
        console.warn('Failed to create backing bill for payment:', e);
      }
    }

    const payment = new Payment({ billId: effectiveBillId, tableNumber, method, amount, reference, metadata, status: 'completed' });
    await payment.save();

    // If billId provided (or we created one), mark bill as paid when amount covers total
    if (effectiveBillId) {
      try {
        const bill = await Bill.findById(effectiveBillId);
        if (bill) {
          const net = bill.totalAmount || 0;
          if ((amount || 0) >= net) {
            bill.status = 'paid';
            await bill.save();
          }
        }
      } catch (e) {
        // ignore
      }
    }

    res.status(201).json(payment);
  } catch (err) {
    console.error('Failed to persist payment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get payments, optionally filtered by tableNumber or billId
router.get('/', async (req, res) => {
  try {
    const { tableNumber, billId } = req.query;
    const q = {};
    if (tableNumber) q.tableNumber = Number(tableNumber);
    if (billId) q.billId = billId;
    const payments = await Payment.find(q).sort({ timestamp: -1 }).limit(100);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Void a payment
router.post('/:id/void', async (req, res) => {
  try {
    const id = req.params.id;
    const p = await Payment.findById(id);
    if (!p) return res.status(404).json({ error: 'Payment not found' });
    p.status = 'voided';
    p.voidedAt = new Date();
    await p.save();
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
