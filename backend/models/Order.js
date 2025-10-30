
import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  items: [
    {
      menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
      quantity: { type: Number, required: true },
      // portion: 'full' | 'half' (default: 'full') controls unit price calculation
      portion: { type: String, enum: ['full', 'half'], default: 'full' },
      notes: { type: String }
    }
  ],
  // include several lifecycle states and priority for urgent orders
  status: { type: String, enum: ['pending', 'received', 'preparing', 'ready', 'delivered', 'completed', 'cancelled', 'billed'], default: 'pending' },
  // priority: normal | urgent
  priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
  total: { type: Number, required: true },
  // optional history to track status changes
  statusHistory: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Order', OrderSchema);
