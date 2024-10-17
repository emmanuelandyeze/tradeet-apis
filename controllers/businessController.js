import Business from '../models/BusinessModel.js'; // Import the Business model
import { Product } from '../models/Product.js'; // Import the Product model

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