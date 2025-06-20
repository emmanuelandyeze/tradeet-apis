// models/Customer.js
import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Vendor',
		required: true,
	},
	name: { type: String, required: true },
	phone: { type: String, required: true },
	email: { type: String },
	orders: [
		{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
	],
	totalSpent: { type: Number, default: 0 },
	loyaltyPoints: {
		totalEarned: { type: Number, default: 0 },
		totalRedeemed: { type: Number, default: 0 },
		currentBalance: { type: Number, default: 0 },
	},
	lastActive: { type: Date },
	notes: { type: String, default: '' },
});

export default mongoose.model('Customer', CustomerSchema);
