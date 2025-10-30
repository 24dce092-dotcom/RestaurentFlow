import express from 'express';
import Bill from '../models/Bill.js';
import Counter from '../models/Counter.js';
import Order from '../models/Order.js';
import autoPrintService from '../services/AutoPrintService.js';

const router = express.Router();

// Create a bill from an order
router.post('/', async (req, res) => {
	try {
		const { orderId } = req.body;
		const order = await Order.findById(orderId)
			.populate('items.menuItem')
			.populate('table'); // ensure we have table.number if stored on a Table doc

		if (!order) return res.status(404).json({ error: 'Order not found' });

		// Determine table number
		const tableNumber = (order.table && order.table.number) || order.tableNumber || null;
		if (tableNumber == null) {
			return res.status(400).json({ error: 'Order is missing a table number' });
		}

		// Compute items array and a fallback total if order.total is missing
			const items = order.items.map(item => {
				const menu = item.menuItem;
				const basePrice = (typeof menu?.price === 'number') ? Number(menu.price) : Number(item.price || 0);
				const portion = item.portion === 'half' ? 'half' : 'full';
				// Determine effective unit price
				let unitPrice = basePrice;
				if (portion === 'half') {
					// Prefer explicit halfPrice from menu item if present, otherwise 50%
					const halfOverride = (menu && typeof menu.halfPrice === 'number') ? Number(menu.halfPrice) : null;
					// Fallback is 70% of full price per new requirement
					unitPrice = halfOverride != null ? halfOverride : Number(((basePrice * 0.7) || 0));
				}
				return {
					name: menu?.name || item.name,
					price: unitPrice,
					unitPrice,
					basePrice,
					quantity: item.quantity || 1,
					portion,
					customizations: item.notes || item.customizations || ''
				};
			});

		const computedTotal = items.reduce((sum, it) => sum + (Number(it.price || it.unitPrice || 0) * (it.quantity || 1)), 0);
		const orderTotal = typeof order.total === 'number' ? order.total : computedTotal;

		// Try to find an existing pending bill for this table. If found, merge this order into it.
		let bill = await Bill.findOne({ tableNumber, status: 'pending' });

		if (bill) {
			// Append order reference, items and add totals. If same item names exist, we simply append as separate entries for simplicity.
			bill.orders = bill.orders || [];
			bill.orders.push(order._id);
			bill.items = bill.items || [];
			bill.items = bill.items.concat(items);
			bill.totalAmount = (bill.totalAmount || 0) + orderTotal;
			await bill.save();
		} else {
			// Atomically increment and assign a sequential bill number
			const counterId = 'billseq';
			const next = await Counter.findByIdAndUpdate(counterId, { $inc: { seq: 1 } }, { new: true, upsert: true });
			const seq = next.seq || 1;
			// Allow configuring an offset and optional prefix via env vars
			const offset = Number(process.env.BILL_SEQ_OFFSET || 0);
			const prefix = process.env.BILL_SEQ_PREFIX || '';
			const finalSeq = seq + offset;
			const billNumber = `${prefix}${finalSeq}`;
			bill = new Bill({
				orders: [order._id],
				tableNumber,
				waiterName: order.waiterName || '',
				items,
				totalAmount: orderTotal,
				billNumber,
				billSeq: seq
			});
			await bill.save();
		}

		// Mark the order as billed so it no longer appears on live dashboards
		try {
			order.status = 'billed';
			order.updatedAt = new Date();
			await order.save();
		} catch (updateErr) {
			console.error('Failed to update order status to billed:', updateErr);
		}

		res.status(201).json(bill);
	} catch (err) {
		// If validation error from Mongoose, return 400 with details
		if (err && err.name === 'ValidationError') {
			return res.status(400).json({ error: 'Validation error', details: err.errors });
		}
		console.error('Error creating bill:', err);
		res.status(500).json({ error: err.message || 'Internal Server Error' });
	}
});

// Get all bills
router.get('/', async (req, res) => {
	try {
		// Support optional query params for client-side filtering
		// /api/bills?tableNumber=12&status=pending
		const { tableNumber, status } = req.query;
		const q = {};
		if (typeof tableNumber !== 'undefined' && tableNumber !== null && String(tableNumber).length > 0) {
			q.tableNumber = Number(tableNumber);
		}
		if (typeof status !== 'undefined' && status !== null && String(status).length > 0) {
			q.status = String(status);
		}
		// populate orders array so clients can inspect which orders were merged into each bill
		const bills = await Bill.find(q).populate('orders');
		
		// For each bill, find the latest payment and attach paymentMethod
		const Payment = (await import('../models/Payment.js')).default;
		const billsWithPayment = await Promise.all(
			bills.map(async (bill) => {
				// Find all completed payments for this bill, sorted by timestamp descending
				const payments = await Payment.find({ billId: bill._id, status: 'completed' }).sort({ timestamp: -1 });
				let paymentMethod = bill.paymentMethod;
				if (!paymentMethod && payments.length > 0) {
					paymentMethod = payments[0].method || payments[0].type;
				}
				// Always set a valid paymentMethod, default to 'cash' if missing
				return { ...bill.toObject(), paymentMethod: paymentMethod || 'cash' };
			})
		);
		
		res.json(billsWithPayment);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Update bill items (partial update) and record edits
router.patch('/:id', async (req, res) => {
	try {
		const billId = req.params.id;
		const { items: newItems, editedBy } = req.body;

		if (!Array.isArray(newItems)) {
			return res.status(400).json({ error: 'items must be an array' });
		}

		const bill = await Bill.findById(billId);
		if (!bill) return res.status(404).json({ error: 'Bill not found' });

		// Build audit changes for price changes only
		const changes = [];
		const oldItems = bill.items || [];
		newItems.forEach((it, idx) => {
			const old = oldItems[idx] || {};
			if (typeof it.price !== 'undefined' && it.price !== old.price) {
				changes.push({ index: idx, field: 'price', oldValue: old.price, newValue: it.price });
			}
			// If other editable fields are added later, handle them here
		});

		// Apply the new items to the bill
		bill.items = newItems;
		// Recompute totalAmount
		bill.totalAmount = (bill.items || []).reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0);

		if (changes.length > 0) {
			bill.edits = bill.edits || [];
			bill.edits.push({ edBy: editedBy || 'unknown', edAt: new Date(), changes });
			bill.lastEdited = new Date();
		}

		const oldStatus = bill.status;
		await bill.save();

		// Emit bill_created event to auto print service (editing existing pending bill counts as created/updated merge)
		try { autoPrintService.onBillEvent('bill_created', bill); } catch(e) { console.warn('Auto print emit failed:', e.message); }

		// If status transitioned to paid trigger bill_paid
		try {
			if (oldStatus !== 'paid' && bill.status === 'paid') {
				autoPrintService.onBillEvent('bill_paid', bill);
			}
		} catch(e) { console.warn('Auto print bill_paid emit failed:', e.message); }

			res.json(bill);
	} catch (err) {
		console.error('Failed to update bill:', err);
		res.status(500).json({ error: err.message || 'Internal Server Error' });
	}
});

	// Print a bill by id (uses printer service default printer)
	router.post('/:id/print', async (req, res) => {
		try {
			const { id } = req.params;
			const { printerId = null, format = 'receipt' } = req.body || {};
			const bill = await Bill.findById(id).populate('orders');
			if (!bill) return res.status(404).json({ error: 'Bill not found' });

			// Lazy load to avoid circular issues
			const { default: PrinterService } = await import('../services/PrinterService.js');
			const printerService = new PrinterService();
			// ensure printers detected (non-blocking best effort)
			await printerService.refreshPrinters();
			const result = await printerService.printBill(bill.toObject(), printerId, format);
			return res.json({ success: true, result });
		} catch (err) {
			console.error('Failed to print bill:', err);
			res.status(500).json({ success: false, error: err.message || 'Print failed' });
		}
	});

// Print a specific bill
router.post('/:id/print', async (req, res) => {
	try {
		const { printerId, format = 'receipt' } = req.body;
		const bill = await Bill.findById(req.params.id).populate('orders');
		
		if (!bill) {
			return res.status(404).json({ error: 'Bill not found' });
		}

		// Import printer service
		const PrinterService = (await import('../services/PrinterService.js')).default;
		const printerService = new PrinterService();

		// Print the bill
		const result = await printerService.printBill(bill, printerId, format);
		
		res.json({
			success: true,
			message: 'Bill printed successfully',
			billId: bill._id,
			billNumber: bill.billNumber,
			result
		});
	} catch (err) {
		console.error('Failed to print bill:', err);
		res.status(500).json({ 
			success: false,
			error: err.message || 'Failed to print bill' 
		});
	}
});

// When updating a bill, if status changes to paid, trigger bill_paid event (handled earlier in router if logic present)
// NOTE: If there's a dedicated PATCH/PUT route above (not shown in this snippet) ensure after saving set:
// if (updated.status === 'paid') autoPrintService.onBillEvent('bill_paid', updated);

export default router;

// (Dev only) Quick pay route: POST /api/bills/:id/dev-pay
// Marks bill as paid and emits bill_paid trigger without needing items array.
if (process.env.NODE_ENV !== 'production') {
	router.post('/:id/dev-pay', async (req, res) => {
		try {
			const bill = await (await import('../models/Bill.js')).default.findById(req.params.id);
			if (!bill) return res.status(404).json({ error: 'Bill not found' });
			if (bill.status !== 'paid') {
				bill.status = 'paid';
				await bill.save();
				try { autoPrintService.onBillEvent('bill_paid', bill); } catch(e) { console.warn('Auto print bill_paid emit failed(dev-pay):', e.message); }
			}
			res.json({ success: true, billId: bill._id, status: bill.status });
		} catch (e) {
			res.status(500).json({ error: e.message });
		}
	});
}
