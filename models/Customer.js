// models/Customer.js
import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema(
	{
		content: { type: String, required: true },
		date: { type: Date, default: Date.now },
		addedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Vendor',
		},
	},
	{ _id: false },
);

const CustomerSchema = new mongoose.Schema(
	{
		vendor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Vendor',
		},

		name: { type: String, required: true },
		phone: { type: String, required: true },
		email: { type: String },

		orders: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Order',
			},
		],
		totalSpent: { type: Number, default: 0 },

		loyaltyPoints: {
			totalEarned: { type: Number, default: 0 },
			totalRedeemed: { type: Number, default: 0 },
			currentBalance: { type: Number, default: 0 },
		},

		group: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Group',
		},
		tags: [{ type: String }],

		address: {
			street: { type: String },
			city: { type: String },
			state: { type: String },
			postalCode: { type: String },
			country: { type: String },
		},

		birthday: { type: Date },
		whatsappOptIn: { type: Boolean, default: true },

		referralCode: { type: String },
		referredBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer',
		},

		notes: [NoteSchema],

		lastActive: { type: Date },
		status: {
			type: String,
			enum: ['active', 'inactive', 'prospect'],
			default: 'prospect',
		},
	},
	{
		timestamps: true,
	},
);

export default mongoose.model('Customer', CustomerSchema);
