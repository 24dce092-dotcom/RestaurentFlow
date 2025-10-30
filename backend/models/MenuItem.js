
import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String },
  available: { type: Boolean, default: true },
  imageUrl: { type: String },
  // half-plate support: allowHalf indicates if this item can be ordered as half portion
  // halfPrice optionally overrides computed 50% price when provided
  allowHalf: { type: Boolean, default: false },
  halfPrice: { type: Number },
  // customId: optional numeric identifier shown in UI (e.g. 100, 101, ...)
  // Make it sparse+unique so only documents that set it are indexed and uniqueness is enforced
  customId: { type: Number, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('MenuItem', MenuItemSchema);
