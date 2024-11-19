import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
	phone: { type: String, required: true, unique: true },
	name: { type: String },
	campus: { type: String },
	password: { type: String },
	isVerified: { type: Boolean, default: false },
	verificationCode: { type: String },
	createdAt: { type: Date, default: Date.now },
	wallet: { type: Number },
	expoPushToken: { type: String },
});

export default mongoose.model('Student', StudentSchema); 
