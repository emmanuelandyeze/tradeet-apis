import express from 'express';
import Customer from '../models/Customer.js';

const router = express.Router();

// Create customer
router.post('/', async (req, res) => {
	try {
		const { phone, name, location } = req.body;

		let customer = await Customer.findOne({ phone });

		if (customer) {
			return res
				.status(400)
				.json({ message: 'Customer already exists' });
		}

		customer = new Customer({
			phone,
			name,
			location,
		});

		await customer.save();
		res.status(201).json(customer);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Server error' });
	}
});

// Get customer by phone
router.get('/:phone', async (req, res) => {
	try {
		const { phone } = req.params;
		const customer = await Customer.findOne({ phone });

		if (!customer) {
			return res
				.status(404)
				.json({ message: 'Customer not found' });
		}

		res.json(customer);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Server error' });
	}
});

// Update customer (name or location)
router.patch('/:phone', async (req, res) => {
	try {
		const { phone } = req.params;
		const updates = req.body;

		const customer = await Customer.findOneAndUpdate(
			{ phone },
			{ $set: updates },
			{ new: true },
		);

		if (!customer) {
			return res
				.status(404)
				.json({ message: 'Customer not found' });
		}

		res.json(customer);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Server error' });
	}
});

export default router;
