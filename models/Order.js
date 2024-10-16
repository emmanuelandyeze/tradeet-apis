import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
	{
		storeId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Business',
			required: true,
		},
		customerInfo: {
			name: { type: String, required: true },
			contact: { type: String, required: true },
			address: { type: String, required: true },
		},
		runnerInfo: {
			runnerId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Runner',
			},
			accepted: { type: Boolean, default: false },
			status: { type: String, default: 'pending' },
			acceptedAt: { type: Date }, // Timestamp for when the runner accepts
		},
		items: [],
		status: {
			type: String,
			enum: [
				'pending',
				'accepted',
				'completed',
				'cancelled',
			],
			default: 'pending',
		},
		payment: {
			type: {
				type: String,
				enum: ['wallet', 'bank'],
				required: true,
			},
			status: {
				type: String,
				enum: ['pending', 'completed', 'failed'],
				default: 'pending',
			},
			statusUpdatedAt: { type: Date }, // Timestamp for payment status
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Student',
			required: true,
		},
	},
	{
		timestamps: true, // Automatically adds createdAt and updatedAt fields
	},
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
