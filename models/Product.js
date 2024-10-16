// models/Product.js
import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
	name: { type: String, required: true },
	price: { type: Number, required: true },
});

const addOnSchema = new mongoose.Schema({
	name: { type: String, required: true },
	price: { type: Number, required: true },
	compulsory: { type: Boolean, default: false },
});

const productSchema = new mongoose.Schema({
	name: { type: String, required: true },
	price: { type: Number, required: true },
	image: { type: String, required: true },
	variants: [variantSchema],
	addOns: [addOnSchema],
	description: { type: String },
	category: { type: String }, // Category of the product
	storeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Store',
		required: true,
	}, // Reference to the store that created the product
});

export const Product = mongoose.model(
	'Product',
	productSchema,
);