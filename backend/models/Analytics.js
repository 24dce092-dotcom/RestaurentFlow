
import mongoose from 'mongoose';

const AnalyticsSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., 'sales', 'visits', 'revenue', etc.
  data: { type: mongoose.Schema.Types.Mixed, required: true }, // Flexible for any analytics data
  period: { type: String }, // e.g., '2025-08', '2025-Q3', '2025-08-27'
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Analytics', AnalyticsSchema);
