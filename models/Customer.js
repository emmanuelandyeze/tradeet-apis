import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
	phone: { type: String, required: true, unique: true },
	name: { type: String },
	createdAt: { type: Date, default: Date.now },
	coins: { type: Number, default: 0 },
	location: {
		type: {
			type: String,
			enum: ['Point'], // GeoJSON type must be "Point"
		},
		coordinates: {
			type: [Number], // [longitude, latitude]
		},
		address: { type: String },
	},
});

export default mongoose.model('Customer', CustomerSchema);
