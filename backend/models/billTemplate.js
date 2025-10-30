import mongoose from 'mongoose';

const billTemplateSchema = new mongoose.Schema({
  restaurantName: String,
  address: String,
  gstNumber: String,
  fssai: { type: String, default: '' },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  serviceTax: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('BillTemplate', billTemplateSchema);
