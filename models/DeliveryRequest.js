// models/DeliveryRequest.js
import mongoose from 'mongoose';

const deliveryRequestSchema = new mongoose.Schema({
	storeName: {
		type: String,
		required: true,
	},
	pickupAddress: {
		type: String,
		required: true,
	},
	deliveryAddress: {
		type: String,
		required: true,
	},
	studentName: {
		type: String,
		required: true,
	},
	studentPhone: {
		type: String,
	},
	runnerInfo: {
		runnerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Runner', // Reference to Runner model
			default: null,
		},
		accepted: {
			type: Boolean,
			default: false,
		},
		acceptedAt: Date,
	},
	status: {
		type: String,
		enum: ['pending', 'accepted', 'rejected'],
		default: 'pending',
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const DeliveryRequest = mongoose.model(
	'DeliveryRequest',
	deliveryRequestSchema,
);

export default DeliveryRequest;
