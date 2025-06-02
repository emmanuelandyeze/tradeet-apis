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
			address: { type: String }, // Address if delivery
			pickUp: { type: Boolean, default: false }, // True if customer picks up
			expoPushToken: { type: String }, // Customer's push token
		},
		runnerInfo: {
			runnerId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Runner',
			},
			accepted: { type: Boolean, default: false },
			status: { type: String, default: 'pending' },
			acceptedAt: { type: Date }, // Timestamp for when the runner accepts
			name: { type: String },
			contact: { type: String },
			expoPushToken: { type: String },
			price: { type: Number },
			assignedAt: { type: Date },
		},
		items: [],
		status: {
			type: String,
			enum: [
				'pending',
				'accepted',
				'in progress',
				'completed',
				'cancelled',
			],
			default: 'pending',
		},
		payment: {
			status: {
				type: String,
				enum: ['pending', 'partial', 'completed', 'failed'],
				default: 'pending',
			},
			statusUpdatedAt: Date,
			method: String,
		},
		payments: [
			{
				amount: { type: Number },
				date: { type: Date, default: Date.now }, // Date of the payment
				method: {
					type: String,
					enum: ['transfer', 'cash', 'paystack'],
					// required: true,
				},
			},
		],
		amountPaid: { type: Number, default: 0 },
		balance: { type: Number, default: 0 },
		paystackReference: String,
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Student',
		},
		totalAmount: { type: Number }, // Amount to be paid
		discountCode: { type: String },
		itemsAmount: { type: Number }, // Amount for store
		orderNumber: { type: String }, // Order number
		deliveryCode: { type: String }, // Delivery code
		deliveryOption: { type: String }, // Delivery option,
		deliveryFee: { type: Number },
		serviceFee: { type: Number },
		discountAmount: { type: Number },
		scheduledTime: { type: String },
	},
	{
		timestamps: true, // Automatically adds createdAt and updatedAt fields
	},
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
