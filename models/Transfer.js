import mongoose from 'mongoose';

const TransferSchema = new mongoose.Schema({
	storeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Store',
		required: true,
	},
	amount: { type: Number, required: true }, // Amount vendor receives (after fee)
	bankCode: { type: String, required: true },
	accountName: { type: String, required: true },
	accountNumber: { type: String, required: true },
	transferFee: { type: Number, required: true }, // Transfer fee deducted from vendor
	status: {
		type: String,
		enum: ['pending', 'success', 'failed'],
		default: 'pending',
	},
	transferReference: { type: String },
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Transfer', TransferSchema);
