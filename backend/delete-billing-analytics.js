// Script to delete all billing and analytics data from MongoDB
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Import models using ESM
let Order;
try { Order = (await import('./models/Order.js')).default; } catch (e) { /* ignore if missing */ }

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurantflow';
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    // Delete all orders (billing data)
    if (Order) {
      const orderResult = await Order.deleteMany({});
      console.log(`Deleted ${orderResult.deletedCount} orders (billing data)`);
    }
    // If you have analytics collections, add similar code here
    // Example: const Analytics = (await import('./models/Analytics.js')).default; await Analytics.deleteMany({});
    console.log('Done.');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
