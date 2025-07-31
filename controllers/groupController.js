import Group from '../models/Group.js';
import Customer from '../models/Customer.js';

// Create a new group
export const createGroup = async (req, res) => {
	try {
		const { name, description, color, vendorId } = req.body;

		const group = new Group({
			name,
			description,
			vendor: vendorId,
			color,
		});

		await group.save();
		res.status(201).json(group);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to create group' });
	}
};

// Get all groups for a vendor
export const getGroups = async (req, res) => {
	try {
		const vendorId = req.params;

		const groups = await Group.find({
			vendor: vendorId,
		}).populate('customers', 'name phone');

		res.json(groups);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to fetch groups' });
	}
};

// Get a single group by ID
export const getGroupById = async (req, res) => {
	try {
		const group = await Group.findOne({
			_id: req.params.id,
			vendor: req.vendor.id,
		}).populate('customers', 'name phone');

		if (!group)
			return res
				.status(404)
				.json({ error: 'Group not found' });

		res.json(group);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to fetch group' });
	}
};

// Update a group's name or description
export const updateGroup = async (req, res) => {
	try {
		const { name, description } = req.body;

		const group = await Group.findOneAndUpdate(
			{ _id: req.params.id, vendor: req.vendor.id },
			{ name, description },
			{ new: true },
		);

		if (!group)
			return res
				.status(404)
				.json({ error: 'Group not found' });

		res.json(group);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to update group' });
	}
};

// Delete a group
export const deleteGroup = async (req, res) => {
	try {
		const group = await Group.findOneAndDelete({
			_id: req.params.id,
			vendor: req.vendor.id,
		});

		if (!group)
			return res
				.status(404)
				.json({ error: 'Group not found' });

		res.json({ message: 'Group deleted successfully' });
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to delete group' });
	}
};

// Add a customer to a group
export const addCustomerToGroup = async (req, res) => {
	try {
		const { customerId } = req.body;

		const group = await Group.findOne({
			_id: req.params.groupId,
			vendor: req.vendor.id,
		});

		if (!group)
			return res
				.status(404)
				.json({ error: 'Group not found' });

		if (!group.customers.includes(customerId)) {
			group.customers.push(customerId);
			await group.save();
		}

		res.json(group);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to add customer to group' });
	}
};

// Remove a customer from a group
export const removeCustomerFromGroup = async (req, res) => {
	try {
		const { customerId } = req.body;

		const group = await Group.findOne({
			_id: req.params.groupId,
			vendor: req.vendor.id,
		});

		if (!group)
			return res
				.status(404)
				.json({ error: 'Group not found' });

		group.customers = group.customers.filter(
			(id) => id.toString() !== customerId,
		);
		await group.save();

		res.json(group);
	} catch (error) {
		res.status(500).json({
			error: 'Failed to remove customer from group',
		});
	}
};
