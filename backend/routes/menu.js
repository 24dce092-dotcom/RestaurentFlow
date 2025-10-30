import express from 'express';
import MenuItem from '../models/MenuItem.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// GET /api/menu
router.get('/', requireRole(['owner','manager','admin']), async (req, res) => {
  const items = await MenuItem.find().sort({ createdAt: -1 });
  res.json(items);
});

// POST /api/menu
router.post('/', requireRole(['owner','manager','admin']), async (req, res) => {
  const { name, price, category, available } = req.body;
  const item = new MenuItem({ name, price, category, available });
  await item.save();
  res.status(201).json(item);
});

// PUT /api/menu/:id
router.put('/:id', requireRole(['owner','manager','admin']), async (req, res) => {
  const updated = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// DELETE /api/menu/:id
router.delete('/:id', requireRole(['owner','manager','admin']), async (req, res) => {
  await MenuItem.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
