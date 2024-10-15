import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema({
	phone: { type: String, required: true, unique: true },
	isVerified: { type: Boolean, default: false },
	verificationCode: String, // store the code temporarily
	name: { type: String },
	logoUrl: { type: String },
	address: { type: String },
	campus: { type: String }, // applicable for Tradeet Campus users
	password: { type: String },
	isVendor: { type: Boolean, default: false }, // differentiate between Business and Campus
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Business', businessSchema);
