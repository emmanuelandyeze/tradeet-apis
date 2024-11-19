import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema({
	code: {
		type: String,
		required: true,
		unique: true,
	},
	percentage: {
		type: Number,
		required: true,
		min: 1,
		max: 100,
	},
	businessId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Business', // Assuming you have a Business model to reference
		required: true,
	},
	isActive: {
		type: Boolean,
		default: true, // Discount is active by default
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

const Discount = mongoose.model('Discount', discountSchema);

export default Discount;
