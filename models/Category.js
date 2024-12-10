import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
	name: { type: String, required: true },
	description: { type: String },
	storeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Business',
		required: true,
	}, // Store-specific categories
});

export const Category = mongoose.model(
	'Category',
	categorySchema,
);
