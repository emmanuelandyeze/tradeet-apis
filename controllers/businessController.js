import Business from '../models/BusinessModel.js'; // Import the Business model

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
