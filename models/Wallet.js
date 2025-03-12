import mongoose from 'mongoose';

const WalletSchema = new mongoose.Schema({
	storeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Business',
		required: true,
	},
	balance: { type: Number, default: 0 },
	transactions: [
		{
			amount: { type: Number, required: true },
			type: {
				type: String,
				enum: ['credit', 'debit'],
				required: true,
			},
			reference: { type: String, required: true },
			description: { type: String },
			date: { type: Date, default: Date.now },
		},
	],
});

export default mongoose.model('Wallet', WalletSchema);
