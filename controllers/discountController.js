import Discount from '../models/Discount.js';

// Create a new discount
export const createDiscount = async (req, res) => {
	const { code, percentage, businessId } = req.body;

	console.log(code, percentage, businessId);
	if (!code || !percentage || !businessId) {
		return res.status(400).json({
			message:
				'Code, percentage, and business ID are required',
		});
	}

	try {
		// Check if the discount code already exists for the given business
		const existingDiscount = await Discount.findOne({
			code,
			businessId,
		});

		if (existingDiscount) {
			return res.status(400).json({
				message:
					'Discount code already exists for this business',
			});
		}

		// Create and save the discount
		const discount = new Discount({
			code,
			percentage,
			businessId,
		});
		await discount.save();

		res.status(201).json({
			message: 'Discount created successfully',
			discount,
		});
	} catch (error) {
		res.status(500).json({
			message: 'Server error',
			error: error.message,
		});
	}
};

// Get all discounts for a specific business
export const getDiscountsByBusiness = async (req, res) => {
	const { businessId } = req.params;

	try {
		const discounts = await Discount.find({ businessId });

		if (discounts.length === 0) {
			return res.status(404).json({
				message: 'No discounts found for this business',
			});
		}

		res.status(200).json(discounts);
	} catch (error) {
		res.status(500).json({
			message: 'Server error',
			error: error.message,
		});
	}
};

// Update a discount (active/inactive toggle or percentage change)
export const updateDiscount = async (req, res) => {
	const { discountId } = req.params;
	const { percentage, isActive } = req.body;

	try {
		const discount = await Discount.findById(discountId);

		if (!discount) {
			return res
				.status(404)
				.json({ message: 'Discount not found' });
		}

		// Update the discount percentage or status
		if (percentage) discount.percentage = percentage;
		if (isActive !== undefined)
			discount.isActive = isActive;

		discount.updatedAt = Date.now(); // Update the timestamp

		await discount.save();

		res.status(200).json({
			message: 'Discount updated successfully',
			discount,
		});
	} catch (error) {
		res.status(500).json({
			message: 'Server error',
			error: error.message,
		});
	}
};

// Delete a discount
export const deleteDiscount = async (req, res) => {
	const { discountId } = req.params;

	try {
		const discount = await Discount.findById(discountId);

		if (!discount) {
			return res
				.status(404)
				.json({ message: 'Discount not found' });
		}

		await discount.remove();
		res
			.status(200)
			.json({ message: 'Discount deleted successfully' });
	} catch (error) {
		res.status(500).json({
			message: 'Server error',
			error: error.message,
		});
	}
};

export const validateDiscountCode = async (req, res) => {
	const { businessId, code } = req.body;

	// Validate required fields
	if (!businessId || !code) {
		return res.status(400).json({
			message: 'Business ID and discount code are required',
		});
	}

	console.log(businessId, code);

	try {
		// Find discount for the given business and code
		const discount = await Discount.findOne({
			businessId,
			code,
		});

		if (!discount) {
			return res
				.status(404)
				.json({ message: 'Invalid discount code' });
		}

		console.log(discount);
		// Check if the discount is active
		if (!discount.isActive) {
			return res.status(400).json({
				message: 'This discount code is inactive',
			});
		}

		// Return discount details
		return res.status(200).json({
			message: 'Discount code validated successfully',
			data: {
				code: discount.code,
				percentage: discount.percentage,
			},
		});
	} catch (error) {
		console.error('Error validating discount code:', error);
		return res
			.status(500)
			.json({ message: 'Server error. Please try again.' });
	}
};
