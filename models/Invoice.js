import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
	customerName: { type: String, required: true },
	customerDetails: { type: String, required: true },
	products: [
		{
			name: { type: String, required: true },
			price: { type: Number, required: true },
			quantity: { type: Number, required: true },
		},
	],
	totalAmount: { type: Number, required: true },
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Invoice', invoiceSchema);
