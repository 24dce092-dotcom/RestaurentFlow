import express from 'express';
import Order from '../models/Order.js';

const router = express.Router();

// Get all orders (exclude billed orders by default)
router.get('/', async (req, res) => {
  try {
    const query = { status: { $ne: 'billed' } };
    const orders = await Order.find(query).populate('table').populate('items.menuItem');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new order
router.post('/', async (req, res) => {
  try {
    // ensure priority defaults to 'normal' if not provided
    const payload = { ...req.body };
    if (!payload.priority) payload.priority = 'normal';
    // Normalize portion on each item
    if (Array.isArray(payload.items)) {
      payload.items = payload.items.map(it => ({
        ...it,
        portion: it?.portion === 'half' ? 'half' : 'full'
      }));
    }
    const order = new Order(payload);
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update an order
router.put('/:id', async (req, res) => {
  try {
    // Set updatedAt and run validators to ensure status/priority enums are enforced
    const update = { ...req.body, updatedAt: new Date() };
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete an order
router.delete('/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
