import mongoose from 'mongoose';


const BillSchema = new mongoose.Schema({
	// support multiple orders per bill so orders from the same table can be merged into one bill
	orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
	tableNumber: { type: Number, required: true },
	waiterName: { type: String },
	items: [{
		name: String,
		price: Number,
		quantity: Number,
		customizations: String,
		// portion captured from order at billing time for correct display/analytics
		portion: { type: String, enum: ['full', 'half'], default: 'full' },
		// optional breakdown fields for clarity
		unitPrice: Number, // effective unit price after portion applied
		basePrice: Number // original menuItem full price at the time
	}],
	// audit trail for manual edits to bills (e.g., manager adjusted rates)
	edits: [{
		edBy: String,
		edAt: { type: Date },
		changes: [{
			index: Number,
			field: String,
			oldValue: mongoose.Schema.Types.Mixed,
			newValue: mongoose.Schema.Types.Mixed
		}]
	}],
	lastEdited: { type: Date },
	totalAmount: { type: Number, required: true, default: 0 },
	status: { type: String, default: 'pending' }, // pending, paid, cancelled
	// persisted sequential bill number, e.g. BILL-001
	billNumber: { type: String, index: true, unique: false },
	// optional numeric sequence value for sorting/searching
	billSeq: { type: Number, index: true },
	createdAt: { type: Date, default: Date.now }
});

const Bill = mongoose.model('Bill', BillSchema);
export default Bill;
