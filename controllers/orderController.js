import Order from '../models/Order.js';
import { io } from '../server.js';

// Create a new order
export const createOrder = async (req, res, next) => {
	try {
		const {
			storeId,
			customerInfo,
			items,
			payment,
			userId,
			totalAmount,
			itemsAmount
		} = req.body;

		const newOrder = new Order({
			storeId,
			customerInfo,
			items,
			payment,
			userId,
			totalAmount,
			itemsAmount,
			status: 'pending', // Default order status
		});

		await newOrder.save();

		// Emit an event to the store that a new order has been placed
		io.emit('newOrder', {
			message: 'New order placed',
			order: newOrder,
		});

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
export const acceptOrder = async (req, res, next) => {
	try {
		const { orderId } = req.params;
		const { runnerId } = req.body;

		const order = await Order.findByIdAndUpdate(
			orderId,
			{
				runnerInfo: {
					runnerId,
					accepted: true,
					acceptedAt: new Date(),
				},
				status: 'accepted',
			},
			{ new: true },
		);

		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		// Notify store and customer that the order has been accepted
		io.to(order.storeId).emit('orderAccepted', {
			message: 'Order accepted by runner',
			order,
		});
		io.to(order.customerInfo.userId).emit('orderAccepted', {
			message: 'Your order has been accepted by a runner',
			order,
		});

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

// Update order status (used for completing or canceling orders)
export const updateOrderStatus = async (req, res, next) => {
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

		// Notify both the customer and the store of the status update
		io.to(order.customerInfo.userId).emit(
			'orderStatusUpdated',
			{
				message: `Order status updated to ${status}`,
				order,
			},
		);
		io.to(order.storeId).emit('orderStatusUpdated', {
			message: `Order status updated to ${status}`,
			order,
		});

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
export const cancelOrder = async (req, res, next) => {
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

		// Notify both the customer and store about the cancellation
		io.to(order.customerInfo.userId).emit(
			'orderCancelled',
			{
				message: 'Your order has been cancelled',
				order,
			},
		);
		io.to(order.storeId).emit('orderCancelled', {
			message: 'Order has been cancelled',
			order,
		});

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
	try {
		const { userId } = req.params;
		const orders = await Order.find({ userId }).populate(
			'storeId',
		);

		if (!orders.length) {
			return res.status(404).json({
				message: 'No orders found for this user.',
			});
		}

		res.json(orders);
	} catch (error) {
		res.status(500).json({
			message: 'Error retrieving orders',
			error: error.message,
		});
	}
};

// Accept an order by vendor
export const acceptOrderByVendor = async (req, res) => {
	console.log('acceptOrderByVendor called');
	const { orderId } = req.params;
	const { storeId } = req.body; // Assuming storeId is in the authenticated user object

	try {
		const order = await Order.findById(orderId);

		console.log('I am here!');
		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		if (order.storeId.toString() !== storeId.toString()) {
			return res.status(403).json({
				message:
					'You are not authorized to accept this order',
			});
		}

		// if (order.status !== 'pending') {
		// 	return res.status(400).json({
		// 		message:
		// 			'Order cannot be accepted in the current status',
		// 	});
		// }

		order.status = 'accepted';
		await order.save();

		io.emit('orderUpdate', order); // Emit the updated order
		console.log('Order update emitted successfully');

		res.status(200).json({
			message: 'Order accepted successfully',
			order,
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};

// Cancel an order by vendor
export const cancelOrderByVendor = async (req, res) => {
	const { orderId } = req.params;
	const { storeId } = req.body; // Assuming storeId is in the authenticated user object

	try {
		const order = await Order.findById(orderId);

		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		if (order.storeId.toString() !== storeId.toString()) {
			return res.status(403).json({
				message:
					'You are not authorized to cancel this order',
			});
		}

		if (order.status !== 'pending') {
			return res.status(400).json({
				message:
					'Order cannot be canceled in the current status',
			});
		}

		order.status = 'canceled';
		await order.save();

		io.emit('orderUpdate', order); // Emit the order cancellation via socket

		res.status(200).json({
			message: 'Order canceled successfully',
			order,
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};