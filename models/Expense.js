import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
	{
		businessId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Business',
			required: true,
		},
		title: { type: String, required: true },
		category: {
			type: String,
			enum: [
				'Inventory',
				'Utilities',
				'Salaries',
				'Others',
			],
			required: true,
		},
		amount: { type: Number, required: true },
		date: { type: Date, default: Date.now },
		description: { type: String },
	},
	{ timestamps: true }, // Adds createdAt and updatedAt fields
);

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
