// Usage:
//   node tools/admin/set-billseq.js 2000
// Sets Counter('billseq').seq to desired value (so next increment becomes desired+1)
import mongoose from 'mongoose';
import Counter from '../../models/Counter.js';

const desired = Number(process.argv[2]);
if (isNaN(desired) || desired < 0) {
  console.error('Provide a non-negative integer, e.g. node tools/admin/set-billseq.js 2000');
  process.exit(1);
}

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurantflow';

async function main() {
  await mongoose.connect(uri);
  // set stored seq to desired (the code adds offset later if needed)
  const doc = await Counter.findByIdAndUpdate('billseq', { $set: { seq: desired } }, { new: true, upsert: true });
  console.log('Counter set. Current stored seq =', doc.seq, '(next increment will be', doc.seq + 1, ')');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
