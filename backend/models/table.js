import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  status: { type: String, default: 'active' },
  capacity: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.model('Table', tableSchema);
