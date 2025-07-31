import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const paymentInfoSchema = new mongoose.Schema(
	{
		bankName: { type: String, required: true },
		accountNumber: { type: String, required: true },
		accountName: { type: String, required: true },
	},
	{ _id: false },
);

const OpeningHoursSchema = new mongoose.Schema(
	{
		Monday: {
			open: { type: Number },
			close: { type: Number },
		},
		Tuesday: {
			open: { type: Number },
			close: { type: Number },
		},
		Wednesday: {
			open: { type: Number },
			close: { type: Number },
		},
		Thursday: {
			open: { type: Number },
			close: { type: Number },
		},
		Friday: {
			open: { type: Number },
			close: { type: Number },
		},
		Saturday: {
			open: { type: Number },
			close: { type: Number },
		},
		Sunday: {
			open: { type: Number },
			close: { type: Number },
		},
	},
	{ _id: false },
);

const socialAccountsSchema = new mongoose.Schema(
	{
		linkedin: {
			id: String,
			name: String,
			email: String,
			accessToken: String, // Consider encrypting in production
		},
		// You can add other platforms here (e.g., Instagram, Facebook, Twitter)
	},
	{ _id: false },
);

const businessSchema = new mongoose.Schema({
	phone: { type: String, required: true, unique: true },
	isVerified: { type: Boolean, default: true },
	verificationCode: String, // store the code temporarily
	name: { type: String },
	logoUrl: { type: String },
	storeBanner: { type: String },
	address: { type: String },
	serviceType: { type: String },
	campus: { type: String }, // applicable for Tradeet Campus users
	password: { type: String },
	isVendor: { type: Boolean, default: false }, // differentiate between Business and Campus
	createdAt: { type: Date, default: Date.now },
	storeLink: { type: String },
	rating: { type: Number, default: 0 },
	estimatedDelivery: { type: String, default: '10 mins' },
	paymentInfo: { type: [paymentInfoSchema], default: [] },
	email: { type: String },
	socialAccounts: socialAccountsSchema,
	// Subscription plan fields
	plan: {
		name: {
			type: String,
			enum: ['Starter', 'Economy', 'Pro'],
			default: 'Starter',
		},
		type: {
			type: Number,
		},
		startDate: { type: Date, default: Date.now },
		expiryDate: { type: Date },
		isActive: { type: Boolean, default: true },
	},
	openingHours: {
		type: OpeningHoursSchema,
	},
	description: { type: String },
	theme: { type: String },
	expoPushToken: { type: String },
	location: {
		type: {
			type: String,
			enum: ['Point'], // GeoJSON type must be "Point"
		},
		coordinates: {
			type: [Number], // [longitude, latitude]
		},
	},
	resetOtp: { type: String },
	resetOtpExpires: { type: Date },
	reviewsEnabled: { type: Boolean, default: false },
	currency: { type: String, default: 'NGN' },
	priceFormat: { type: String, default: 'comma' },
	joinedCommunity: { type: Boolean, default: false },
	sharedOnce: { type: Boolean, default: false },
	category: { type: String },
});

businessSchema.index({ location: '2dsphere' }); // Add geospatial index

export default mongoose.model('Business', businessSchema);

// Hash password before saving
businessSchema.pre('save', async function (next) {
	if (!this.isModified('password')) return next();
	const salt = await bcrypt.genSalt(10); 
	this.password = bcrypt.hash(this.password, salt);
	next();
});
