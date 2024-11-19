// models/runnerModel.js
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
	{
		type: {
			type: String,
			enum: ['earning', 'withdrawal'], // Define types of transactions
			required: true,
		},
		amount: {
			type: Number,
			required: true,
		},
		date: {
			type: Date,
			default: Date.now, // Automatically set the transaction date
		},
		description: {
			type: String, // Optional field to describe the transaction
		},
	},
	{ _id: false },
);

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
		transactions: [transactionSchema], // Array of transactions
		price: { type: Number, default: 200 },
		expoPushToken: { type: String },
	},
	{ timestamps: true },
);

const Runner = mongoose.model('Runner', runnerSchema);

export default Runner;
