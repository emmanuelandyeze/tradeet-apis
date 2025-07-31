import Customer from '../models/Customer.js';
import Group from '../models/Group.js';
import BusinessModel from '../models/BusinessModel.js';
import axios from 'axios';
// import sendWhatsAppMessage from '../services/whatsappService.js';

const PHONE_NUMBER_ID = '432799279914651';

const sendWhatsAppMessage = async (
	phone,
	message,
	image,
	vendor,
) => {
	try {
		const response = await axios.post(
			`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
			{
				messaging_product: 'whatsapp',
				to: phone,
				text: {
					body:
						message + '\n\n' + 'Sent from ' + vendor.name,
				},
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.FB_SECRET}`,
					'Content-Type': 'application/json',
				},
			},
		);

		console.log(
			`✅ WhatsApp message sent successfully to ${phone}`,
		);
		console.log('📦 Response:', response.data);
	} catch (error) {
		console.error(
			`❌ Failed to send WhatsApp message to ${phone}`,
		);
		if (error.response) {
			console.error(
				'🔻 Error Response:',
				error.response.data,
			);
		} else {
			console.error('🔻 Error:', error.message);
		}
	}
};

// Create a new customer
export const createCustomer = async (req, res) => {
	try {
		const { name, phone, email, group, vendorId } =
			req.body;

		if (!vendorId)
			return res
				.status(400)
				.json({ error: 'Vendor ID is required' });

		const customer = new Customer({
			vendor: vendorId,
			name,
			phone,
			email,
			group,
		});

		await customer.save();
		res.status(201).json(customer);
	} catch (error) {
		console.error('Create customer error:', error);
		res
			.status(500)
			.json({ error: 'Failed to create customer' });
	}
};

// Update customer
export const updateCustomer = async (req, res) => {
	try {
		const { vendorId } = req.body;

		if (!vendorId)
			return res
				.status(400)
				.json({ error: 'Vendor ID is required' });

		const updated = await Customer.findOneAndUpdate(
			{ _id: req.params.id, vendor: vendorId },
			req.body,
			{ new: true },
		);

		if (!updated)
			return res
				.status(404)
				.json({ error: 'Customer not found' });

		res.json(updated);
	} catch (error) {
		console.error('Update error:', error);
		res
			.status(500)
			.json({ error: 'Failed to update customer' });
	}
};

// Delete customer
export const deleteCustomer = async (req, res) => {
	try {
		const { vendorId } = req.body;

		if (!vendorId)
			return res
				.status(400)
				.json({ error: 'Vendor ID is required' });

		const deleted = await Customer.findOneAndDelete({
			_id: req.params.id,
			vendor: vendorId,
		});

		if (!deleted)
			return res
				.status(404)
				.json({ error: 'Customer not found' });

		res.json({ message: 'Customer deleted' });
	} catch (error) {
		console.error('Delete error:', error);
		res
			.status(500)
			.json({ error: 'Failed to delete customer' });
	}
};

// Get all customers
export const getCustomers = async (req, res) => {
	try {
		const { vendorId } = req.query;
		console.log(vendorId);

		if (!vendorId) {
			return res
				.status(400)
				.json({ error: 'Vendor ID is required' });
		}

		const customers = await Customer.find({
			vendor: vendorId,
		})
			.sort({ lastActive: -1 })
			.populate('group', 'name') // Populate group with just the name
			.lean();

		res.json(customers);
	} catch (error) {
		console.error('Fetch error:', error);
		res
			.status(500)
			.json({ error: 'Failed to fetch customers' });
	}
};

// Get customer by ID
export const getCustomerById = async (req, res) => {
	try {
		const { vendorId } = req.body;

		if (!vendorId) {
			return res
				.status(400)
				.json({ error: 'Vendor ID is required' });
		}

		const customer = await Customer.findOne({
			_id: req.params.id,
			vendor: vendorId,
		}).populate('group', 'name description');

		if (!customer) {
			return res
				.status(404)
				.json({ error: 'Customer not found' });
		}

		res.json(customer);
	} catch (error) {
		console.error('Fetch customer error:', error);
		res
			.status(500)
			.json({ error: 'Failed to fetch customer' });
	}
};

// Broadcast WhatsApp to selected customers
export const broadcastToCustomers = async (req, res) => {
	try {
		const { recipientPhones, message, image, vendorId } =
			req.body;

		if (!vendorId)
			return res
				.status(400)
				.json({ error: 'Vendor ID is required' });

		// const customers = await Customer.find({
		// 	_id: { $in: customerIds },
		// 	vendor: vendorId,
		// });

		const vendor = await BusinessModel.findById(vendorId);

		for (let phone of recipientPhones) {
			await sendWhatsAppMessage(
				phone,
				message,
				image,
				vendor,
			);
		}

		res.json({ message: 'Broadcast sent successfully' });
	} catch (error) {
		console.error('Broadcast error:', error);
		res
			.status(500)
			.json({ error: 'Failed to send broadcast' });
	}
};

// Add customers to a group
export const addCustomersToGroup = async (req, res) => {
	try {
		const { groupId, customerIds, vendorId } = req.body;

		if (!vendorId)
			return res
				.status(400)
				.json({ error: 'Vendor ID is required' });

		const group = await Group.findOne({
			_id: groupId,
			vendor: vendorId,
		});
		if (!group)
			return res
				.status(404)
				.json({ error: 'Group not found' });

		await Customer.updateMany(
			{ _id: { $in: customerIds }, vendor: vendorId },
			{ $set: { group: groupId } },
		);

		res.json({ message: 'Customers added to group' });
	} catch (error) {
		console.error('Add to group error:', error);
		res
			.status(500)
			.json({ error: 'Failed to add customers to group' });
	}
};

// Update group for customers
export const updateGroup = async (req, res) => {
	try {
		const { oldGroupId, newGroupId, vendorId } = req.body;

		if (!vendorId)
			return res
				.status(400)
				.json({ error: 'Vendor ID is required' });

		const result = await Customer.updateMany(
			{ vendor: vendorId, group: oldGroupId },
			{ $set: { group: newGroupId } },
		);

		res.json({
			message: 'Group updated for customers',
			count: result.modifiedCount,
		});
	} catch (error) {
		console.error('Update group error:', error);
		res
			.status(500)
			.json({ error: 'Failed to update group' });
	}
};

// Remove group from customers
export const deleteGroup = async (req, res) => {
	try {
		const { groupId, vendorId } = req.body;

		if (!vendorId)
			return res
				.status(400)
				.json({ error: 'Vendor ID is required' });

		await Customer.updateMany(
			{ vendor: vendorId, group: groupId },
			{ $unset: { group: '' } },
		);

		res.json({ message: 'Group removed from customers' });
	} catch (error) {
		console.error('Delete group error:', error);
		res
			.status(500)
			.json({ error: 'Failed to remove group' });
	}
};
