import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
	},
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Vendor',
		required: true,
		index: true,
	},
	customers: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer',
		},
	],
	color: { type: String, default: 'gray' },
	createdAt: {
		type: Date,
		default: Date.now,
	},
	description: {
		type: String,
		default: '',
	},
});

export default mongoose.model('Group', GroupSchema);
