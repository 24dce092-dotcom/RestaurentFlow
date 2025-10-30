import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Bill from '../../models/Bill.js';
import Payment from '../../models/Payment.js';

// Usage:
//   node tools/admin/delete-all-but-today-bills.js yes
// or set FORCE_DELETE=1 to skip interactive confirmation

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurantflow';
const doDelete = (process.argv[2] === 'yes') || process.env.FORCE_DELETE === '1';

async function main() {
  await mongoose.connect(uri);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  console.log('Keeping bills with createdAt >=', startOfDay.toISOString(), 'and <', endOfDay.toISOString());

  // Find bills to delete (not today's)
  const toDelete = await Bill.find({ $or: [ { createdAt: { $lt: startOfDay } }, { createdAt: { $gte: endOfDay } } ] }).lean();
  if (!toDelete || toDelete.length === 0) {
    console.log('No bills to delete (all bills are from today).');
    await mongoose.disconnect();
    return;
  }

  const ids = toDelete.map(b => b._id.toString());
  console.log(`Found ${toDelete.length} bills to delete.`);

  // Find related payments
  const payments = await Payment.find({ billId: { $in: ids } }).lean();
  console.log(`Found ${payments.length} payments referencing these bills.`);

  // Backup to file before deletion
  const backupsDir = path.join(process.cwd(), 'tools', 'admin', 'backups');
  try { fs.mkdirSync(backupsDir, { recursive: true }); } catch (e) {}
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(backupsDir, `deleted-bills-backup-${ts}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ timestamp: new Date().toISOString(), bills: toDelete, payments }, null, 2));
  console.log('Backed up deleted records to', outFile);

  if (!doDelete) {
    console.log('Dry run (did not delete). To perform deletion, re-run with argument "yes" or set FORCE_DELETE=1');
    await mongoose.disconnect();
    return;
  }

  // Perform deletion
  const delBills = await Bill.deleteMany({ _id: { $in: ids } });
  const delPayments = await Payment.deleteMany({ billId: { $in: ids } });

  console.log(`Deleted ${delBills.deletedCount || 0} bills and ${delPayments.deletedCount || 0} payments.`);

  await mongoose.disconnect();
}

main().catch(err => { console.error('Script failed:', err); process.exit(1); });
