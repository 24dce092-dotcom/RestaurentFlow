#!/usr/bin/env node
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Bill from '../models/Bill.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurantflow';

async function main() {
  console.log('Connecting to MongoDB...', MONGO_URI);
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    const payments = await Payment.find({}).lean();
    console.log(`Found ${payments.length} payments`);

    let created = 0;
    for (const p of payments) {
      const billId = p.billId || (p.bill && (p.bill._id || p.bill.id));
      if (billId) continue; // already associated

      // create minimal Bill
      const createdAt = p.timestamp ? new Date(p.timestamp) : new Date(p.createdAt || p.date || Date.now());
      const newBill = new Bill({
        tableNumber: p.tableNumber || p.table || null,
        items: [],
        totalAmount: Number(p.amount) || 0,
        status: 'paid',
        createdAt
      });
      await newBill.save();

      // attach billId to payment
      try {
        await Payment.updateOne({ _id: p._id }, { $set: { billId: newBill._id } });
      } catch (e) {
        console.warn('Failed to attach billId to payment', p._id, e.message);
      }
      created++;
    }

    console.log(`Backfilled ${created} payments with new Bill records`);
  } catch (err) {
    console.error('Backfill failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
