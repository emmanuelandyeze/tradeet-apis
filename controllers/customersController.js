// controllers/customers.js
import Customer from '../models/Customer.js';

export const getCustomers = async (req, res) => {
	const { vendorId } = req.params;
	const customers = await Customer.find({
		vendor: vendorId,
	})
		.select(
			'name phone loyaltyPoints.totalEarned totalSpent lastActive',
		)
		.sort({ lastActive: -1 });

	res.json(customers);
};

export const getCustomerById = async (req, res) => {
	const customer = await Customer.findOne({
		_id: req.params.id,
		vendor: req.vendor.id,
	});

	if (!customer)
		return res
			.status(404)
			.json({ error: 'Customer not found' });

	res.json(customer);
};
