import express from 'express';
import BillTemplate from '../models/billTemplate.js';

const router = express.Router();

// GET /api/bill-template
router.get('/', async (req, res) => {
  let tmpl = await BillTemplate.findOne();
  if (!tmpl) {
    tmpl = await BillTemplate.create({ restaurantName: '', address: '', gstNumber: '', fssai: '', cgst: 0, sgst: 0, serviceTax: 0 });
  }
  res.json(tmpl);
});

// PUT /api/bill-template
router.put('/', async (req, res) => {
  // Normalize and validate fssai if present
  if (req.body && typeof req.body.fssai !== 'undefined' && req.body.fssai !== null) {
    const raw = String(req.body.fssai || '');
    const norm = raw.replace(/\D/g, '');
    // If provided but not empty, require 14 digits
    if (norm.length > 0 && norm.length !== 14) {
      return res.status(400).json({ error: 'FSSAI must be 14 digits' });
    }
    req.body.fssai = norm;
  }

  let tmpl = await BillTemplate.findOne();
  if (!tmpl) {
    tmpl = new BillTemplate(req.body);
    await tmpl.save();
    return res.json(tmpl);
  }
  Object.assign(tmpl, req.body);
  await tmpl.save();
  res.json(tmpl);
});

export default router;
