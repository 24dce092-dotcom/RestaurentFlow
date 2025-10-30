
import express from 'express';
import Analytics from '../models/Analytics.js';
const router = express.Router();

// Add new analytics data
router.post('/', async (req, res) => {
  try {
    const analytics = new Analytics(req.body);
    await analytics.save();
    res.status(201).json(analytics);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Query analytics data (all or by type/period)
router.get('/', async (req, res) => {
  try {
    const { type, period } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (period) filter.period = period;
    const analytics = await Analytics.find(filter).sort({ createdAt: -1 });
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a specific analytics record
router.delete('/:id', async (req, res) => {
  try {
    const result = await Analytics.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all analytics data
router.delete('/', async (req, res) => {
  try {
    const result = await Analytics.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} analytics records` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
