// models/runnerModel.js
import mongoose from 'mongoose';

const runnerSchema = new mongoose.Schema(
	{
		name: {
			type: String,
		},
		phone: { type: String, required: true, unique: true },
		nin: {
			type: String,
			unique: true, // Ensure NIN is unique
		},
		profileImage: {
			type: String, // URL to the uploaded image
		},
		isApproved: {
			type: Boolean,
			default: false, // Initially set to false until approved by admin
		},
		campus: {
			type: String,
		},
		password: { type: String },
		isVerified: { type: Boolean, default: false },
		verificationCode: {
			type: String, // Store the verification code
		},
		wallet: { type: Number, default: 0 },
		isActive: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

const Runner = mongoose.model('Runner', runnerSchema);

export default Runner;
