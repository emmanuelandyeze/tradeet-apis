import Order from '../models/Order.js';

// Create a new order
export const createOrder = async (req, res) => {
	try {
		const {
			storeId,
			customerInfo,
			items,
			payment,
			userId,
		} = req.body;

		const newOrder = new Order({
			storeId,
			customerInfo,
			items,
			payment,
			userId,
		});

		await newOrder.save();

		res.status(201).json({
			message: 'Order placed successfully',
			order: newOrder,
		});
	} catch (error) {
		res.status(500).json({
			message: 'Error placing order',
			error: error.message,
		});
	}
};

// Accept an order by the runner
export const acceptOrder = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { runnerId } = req.body; // Expecting runnerId in request body

		const order = await Order.findByIdAndUpdate(
			orderId,
			{
				runnerInfo: {
					runnerId,
					accepted: true,
					acceptedAt: new Date(), // Set the acceptance timestamp
				},
				status: 'accepted', // Update order status
			},
			{ new: true },
		);

		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		res.json({
			message: 'Order accepted successfully',
			order,
		});
	} catch (error) {
		res.status(500).json({
			message: 'Error accepting order',
			error: error.message,
		});
	}
};

// Get all orders
export const getAllOrders = async (req, res) => {
	try {
		const orders = await Order.find()
			.populate('storeId')
			.populate('runnerInfo.runnerId');
		res.json(orders);
	} catch (error) {
		res.status(500).json({
			message: 'Error fetching orders',
			error: error.message,
		});
	}
};

// Get a specific order by ID
export const getOrderById = async (req, res) => {
	try {
		const order = await Order.findById(req.params.orderId)
			.populate('storeId')
			.populate('runnerInfo.runnerId');

		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		res.json(order);
	} catch (error) {
		res.status(500).json({
			message: 'Error fetching order',
			error: error.message,
		});
	}
};

// Update order status (used for completing or cancelling orders)
export const updateOrderStatus = async (req, res) => {
	try {
		const { status } = req.body;
		const order = await Order.findByIdAndUpdate(
			req.params.orderId,
			{ status },
			{ new: true },
		);

		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		res.json({
			message: `Order status updated to ${status}`,
			order,
		});
	} catch (error) {
		res.status(500).json({
			message: 'Error updating order status',
			error: error.message,
		});
	}
};

// Cancel an order
export const cancelOrder = async (req, res) => {
	try {
		const order = await Order.findByIdAndUpdate(
			req.params.orderId,
			{ status: 'cancelled' },
			{ new: true },
		);

		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		res.json({
			message: 'Order cancelled successfully',
			order,
		});
	} catch (error) {
		res.status(500).json({
			message: 'Error cancelling order',
			error: error.message,
		});
	}
};

// Get orders for a specific store
export const getOrdersForStore = async (req, res) => {
	try {
		const { storeId } = req.params;

		const orders = await Order.find({ storeId })
			.populate('storeId')
			.populate('runnerInfo.runnerId');

		res.json(orders);
	} catch (error) {
		res.status(500).json({
			message: 'Error fetching orders for the store',
			error: error.message,
		});
	}
};

// Get incoming orders for a specific runner
export const getIncomingOrdersForRunner = async (
	req,
	res,
) => {
	try {
		const { runnerId } = req.params;

		const orders = await Order.find({
			'runnerInfo.runnerId': { $ne: runnerId },
			status: 'pending',
		})
			.populate('storeId')
			.populate('runnerInfo.runnerId');

		res.json(orders);
	} catch (error) {
		res.status(500).json({
			message:
				'Error fetching incoming orders for the runner',
			error: error.message,
		});
	}
};

// Get accepted orders for a specific runner
export const getAcceptedOrdersForRunner = async (
	req,
	res,
) => {
	try {
		const { runnerId } = req.params;

		const orders = await Order.find({
			'runnerInfo.runnerId': runnerId,
			'runnerInfo.accepted': true,
		})
			.populate('storeId')
			.populate('runnerInfo.runnerId');

		res.json(orders);
	} catch (error) {
		res.status(500).json({
			message:
				'Error fetching accepted orders for the runner',
			error: error.message,
		});
	}
};

// Get orders by user ID
export const getOrdersByUserId = async (req, res) => {
	const { userId } = req.params; // Extract userId from URL params
	console.log(userId);

	try {
		const orders = await Order.find({ userId }).populate(
			'storeId',
		); // Populate the store information

		console.log(orders);
		console.log('here');
		if (!orders.length) {
			return res.status(404).json({
				message: 'No orders found for this user.',
			});
		}

		res.status(200).json(orders);
	} catch (error) {
		res.status(500).json({
			message: 'Error retrieving orders',
			error: error.message,
		});
	}
};
