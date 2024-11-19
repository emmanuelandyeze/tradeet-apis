import BusinessModel from '../models/BusinessModel.js';
import Business from '../models/BusinessModel.js'; // Import the Business model
import { Product } from '../models/Product.js'; // Import the Product model
import Order from '../models/Order.js';

// Controller to find businesses by service type and campus
export const findBusinessesByServiceTypeAndCampus = async (
	req,
	res,
) => {
	const { serviceType, campus } = req.query;

	try {
		// Find businesses that match both serviceType and campus
		const businesses = await Business.find({
			serviceType: serviceType, // Match the provided serviceType
			campus: campus, // Match the provided campus
		});

		// If no businesses are found, return a 404 response
		if (!businesses.length) {
			return res.status(404).json({
				message:
					'No businesses found for the specified service type and campus.',
			});
		}

		// Return the found businesses
		res.status(200).json({
			success: true,
			count: businesses.length,
			data: businesses,
		});
	} catch (error) {
		// Handle errors and return a 500 response
		console.error(error);
		res.status(500).json({
			message: 'Server error. Please try again later.',
		});
	}
};

// Controller to find business details and products for a specific business
export const findBusinessAndProductsById = async (
	req,
	res,
) => {
	const { businessId } = req.params;

	try {
		// Find the business by the provided businessId
		const business = await Business.findById(
			businessId,
		).select('-password');

		// If the business is not found, return a 404 response
		if (!business) {
			return res.status(404).json({
				message: 'Business not found.',
			});
		}

		// Find all products that belong to the specific business
		const products = await Product.find({
			storeId: businessId,
		});

		// Return the business details along with the associated products
		res.status(200).json({
			success: true,
			business: business,
			products: products,
		});
	} catch (error) {
		// Handle errors and return a 500 response
		console.error(error);
		res.status(500).json({
			message: 'Server error. Please try again later.',
		});
	}
};

// Controller to get business information by business ID
export const findBusinessById = async (req, res) => {
	const { businessId } = req.params;

	try {
		// Find the business by the provided businessId, excluding password
		const business = await Business.findById(
			businessId,
		).select('-password');

		// If the business is not found, return a 404 response
		if (!business) {
			return res.status(404).json({
				message: 'Business not found.',
			});
		}

		// Return the business details
		res.status(200).json({
			success: true,
			business: business,
		});
	} catch (error) {
		// Handle errors and return a 500 response
		console.error(error);
		res.status(500).json({
			message: 'Server error. Please try again later.',
		});
	}
};

// Controller to add a new payment info
export const addPaymentInfo = async (req, res) => {
	const { businessId } = req.params;
	const { bankName, accountNumber, accountName } = req.body;

	try {
		const business = await Business.findById(businessId);

		if (!business) {
			return res
				.status(404)
				.json({ message: 'Business not found.' });
		}

		const newPaymentInfo = {
			bankName,
			accountNumber,
			accountName,
		};
		business.paymentInfo.push(newPaymentInfo);

		await business.save();
		res
			.status(201)
			.json({ success: true, paymentInfo: newPaymentInfo });
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({
				message: 'Server error. Please try again later.',
			});
	}
};

// Controller to update existing payment info
export const updatePaymentInfo = async (req, res) => {
	const { businessId, paymentId } = req.params;
	const { bankName, accountNumber, accountName } = req.body;

	try {
		const business = await Business.findById(businessId);

		if (!business) {
			return res
				.status(404)
				.json({ message: 'Business not found.' });
		}

		const paymentInfo = business.paymentInfo.id(paymentId);
		if (!paymentInfo) {
			return res
				.status(404)
				.json({ message: 'Payment info not found.' });
		}

		paymentInfo.bankName = bankName;
		paymentInfo.accountNumber = accountNumber;
		paymentInfo.accountName = accountName;

		await business.save();
		res.status(200).json({ success: true, paymentInfo });
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({
				message: 'Server error. Please try again later.',
			});
	}
};

// Controller to delete a payment info
export const deletePaymentInfo = async (req, res) => {
	const { businessId, paymentId } = req.params;

	try {
		const business = await Business.findById(businessId);

		if (!business) {
			return res
				.status(404)
				.json({ message: 'Business not found.' });
		}

		const paymentInfo = business.paymentInfo.id(paymentId);
		if (!paymentInfo) {
			return res
				.status(404)
				.json({ message: 'Payment info not found.' });
		}

		paymentInfo.remove();
		await business.save();
		res
			.status(200)
			.json({
				success: true,
				message: 'Payment info deleted.',
			});
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({
				message: 'Server error. Please try again later.',
			});
	}
};

// Controller to get all payment info for a business
export const getPaymentInfo = async (req, res) => {
	const { businessId } = req.params;

	try {
		const business = await Business.findById(
			businessId,
		).select('paymentInfo');

		if (!business) {
			return res
				.status(404)
				.json({ message: 'Business not found.' });
		}

		res
			.status(200)
			.json({
				success: true,
				paymentInfo: business.paymentInfo,
			});
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({
				message: 'Server error. Please try again later.',
			});
	}
};

// Controller to update subscription info
export const updateSubscription = async (req, res) => {
	const { businessId } = req.params;
	const { planName, planType, startDate } = req.body;

	try {
		const business = await Business.findById(businessId);

		if (!business) {
			return res
				.status(404)
				.json({ message: 'Business not found.' });
		}

		const calculateExpiryDate = (startDate, planType) => {
			const expiryDate = new Date(startDate);
			if (planType === 'Monthly') {
				expiryDate.setMonth(expiryDate.getMonth() + 1);
			} else if (planType === 'Annual') {
				expiryDate.setFullYear(
					expiryDate.getFullYear() + 1,
				);
			}
			return expiryDate;
		};

		const expiryDate = calculateExpiryDate(
			startDate,
			planType,
		);

		business.plan = {
			name: planName,
			type: planType,
			startDate,
			expiryDate,
			isActive: true,
		};

		await business.save();
		res
			.status(200)
			.json({ success: true, plan: business.plan });
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({
				message: 'Server error. Please try again later.',
			});
	}
};

// Controller to get subscription info for a business
export const getSubscriptionInfo = async (req, res) => {
	const { businessId } = req.params;

	try {
		const business = await Business.findById(
			businessId,
		).select('plan');

		if (!business) {
			return res
				.status(404)
				.json({ message: 'Business not found.' });
		}

		res
			.status(200)
			.json({ success: true, plan: business.plan });
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({
				message: 'Server error. Please try again later.',
			});
	}
};

// Controller to update business information
export const updateBusinessInfo = async (req, res) => {
	const { businessId } = req.params;
	const {
		name,
		logoUrl,
		address,
		serviceType,
		campus,
		storeLink,
		rating,
		estimatedDelivery,
		openingHours,
		description,
		theme,
		plan, // Include plan object if provided in the request
		expoToken,
	} = req.body;

	try {
		// Find the business by ID
		const business = await Business.findById(businessId);

		// If the business is not found, return a 404 response
		if (!business) {
			return res
				.status(404)
				.json({ message: 'Business not found.' });
		}

		// Update business fields if they are provided in the request
		if (name) business.name = name;
		if (logoUrl) business.logoUrl = logoUrl;
		if (address) business.address = address;
		if (serviceType) business.serviceType = serviceType;
		if (campus) business.campus = campus;
		if (storeLink) business.storeLink = storeLink;
		if (rating) business.rating = rating;
		if (estimatedDelivery)
			business.estimatedDelivery = estimatedDelivery;
		if (openingHours) business.openingHours = openingHours;
		if (description) business.description = description;
		if (theme) business.theme = theme;
		if (expoToken) business.expoToken = expoToken;

		// If plan is provided, update subscription details
		if (plan) {
			if (plan.name) business.plan.name = plan.name;
			if (plan.type) business.plan.type = plan.type;
			if (plan.startDate)
				business.plan.startDate = plan.startDate;
			if (plan.expiryDate)
				business.plan.expiryDate = plan.expiryDate;
			if (plan.isActive !== undefined)
				business.plan.isActive = plan.isActive;
		}

		// Save the updated business information
		await business.save();

		// Return the updated business information
		res.status(200).json({
			success: true,
			message: 'Business information updated successfully.',
			business: business,
		});
	} catch (error) {
		// Handle errors and return a 500 response
		console.error(error);
		res
			.status(500)
			.json({
				message: 'Server error. Please try again later.',
			});
	}
};

export const updateExpoToken = async (req, res) => {
	try {
		const { expoPushToken } = req.body;
		const { businessId } = req.params;

		if (!expoPushToken) {
			return res
				.status(400)
				.json({ message: 'Expo Push Token is required' });
		}

		// Update the user's record in the database
		await Business.findByIdAndUpdate(businessId, {
			expoPushToken,
		});

		return res.status(200).json({
			message: 'Expo Push Token updated successfully',
		});
	} catch (error) {
		console.error('Error updating expoPushToken:', error);
		res
			.status(500)
			.json({ message: 'Internal Server Error' });
	}
};

// Mark an order as delivered by a runner
export const markOrderAsDelivered = async (req, res) => {
	const { businessId, orderId } = req.params;
	const { deliveryCode } = req.body;

	console.log(businessId, orderId, deliveryCode);

	try {
		// Find the order by ID and check if the runner matches
		const order = await Order.findOne({
			_id: orderId,
			storeId: businessId,
		});

		if (!order) {
			return res.status(404).json({
				message:
					'Order not found or does not belong to this business',
			});
		}

		// Check if the delivery code matches
		if (order.deliveryCode !== deliveryCode) {
			return res.status(400).json({
				message: 'Invalid delivery code',
			});
		}

		// Update the order status to "completed"
		order.status = 'completed';
		await order.save();

		res.status(200).json({
			message: 'Order marked as delivered',
			order,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: 'Error marking order as delivered',
			error: error.message,
		});
	}
};
