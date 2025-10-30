import mongoose from 'mongoose';
import MenuItem from '../models/MenuItem.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurantflow';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB for backfill');

  // Find max existing customId
  const maxDoc = await MenuItem.find({ customId: { $ne: null } }).sort({ customId: -1 }).limit(1).lean();
  let next = 100;
  if (maxDoc && maxDoc.length > 0 && typeof maxDoc[0].customId === 'number') {
    next = Math.max(next, maxDoc[0].customId + 1);
  }

  const missing = await MenuItem.find({ $or: [{ customId: { $exists: false } }, { customId: null }] }).lean();
  console.log('Found', missing.length, 'items missing customId');

  for (const doc of missing) {
    try {
      console.log('Assigning customId', next, 'to', doc._id, doc.name);
      await MenuItem.findByIdAndUpdate(doc._id, { customId: next });
      next += 1;
    } catch (err) {
      console.error('Failed to assign customId for', doc._id, err.message);
    }
  }

  // Ensure indexes are synced
  try {
    await MenuItem.syncIndexes();
    console.log('Indexes synced');
  } catch (err) {
    console.error('Failed to sync indexes', err.message);
  }

  await mongoose.disconnect();
  console.log('Backfill complete');
}

run().catch(err => {
  console.error('Backfill error', err);
  process.exit(1);
});
