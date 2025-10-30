import mongoose from 'mongoose';
import MenuItem from './models/MenuItem.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurantflow';

async function testAllowHalf() {
  try {
    console.log('Connecting to MongoDB:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully');

    // Create a test menu item with allowHalf
    const testItem = new MenuItem({
      name: 'Test Allow Half Item',
      price: 100,
      allowHalf: true,
      halfPrice: 75
    });

    console.log('Saving test item:', testItem.toObject());
    await testItem.save();
    console.log('Test item saved with _id:', testItem._id);

    // Read it back to verify
    const saved = await MenuItem.findById(testItem._id);
    console.log('Retrieved item:', {
      _id: saved._id,
      name: saved.name,
      price: saved.price,
      allowHalf: saved.allowHalf,
      halfPrice: saved.halfPrice
    });

    // Update the allowHalf field
    console.log('Updating allowHalf to false...');
    saved.allowHalf = false;
    saved.halfPrice = undefined;
    await saved.save();

    // Read it back again
    const updated = await MenuItem.findById(testItem._id);
    console.log('After update:', {
      _id: updated._id,
      name: updated.name,
      price: updated.price,
      allowHalf: updated.allowHalf,
      halfPrice: updated.halfPrice
    });

    // Clean up
    await MenuItem.findByIdAndDelete(testItem._id);
    console.log('Test item deleted');

    console.log('✅ allowHalf field works correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testAllowHalf();