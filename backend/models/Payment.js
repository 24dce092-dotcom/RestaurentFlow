import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
  tableNumber: { type: Number },
  method: { type: String }, // cash|card|upi
  amount: { type: Number, required: true },
  status: { type: String, default: 'completed' }, // completed | voided | failed
  reference: { type: String },
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
  voidedAt: { type: Date }
});

const Payment = mongoose.model('Payment', PaymentSchema);
export default Payment;
