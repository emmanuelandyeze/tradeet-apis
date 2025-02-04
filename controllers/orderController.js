import Order from '../models/Order.js';
import Runner from '../models/Runner.js';
import StudentModel from '../models/StudentModel.js';
import { io } from '../server.js';

export const createOrder = async (req, res, next) => {
	try {
		const {
			storeId,
			customerInfo,
			items,
			payment,
			userId,
			totalAmount,
			itemsAmount,
			runnerInfo,
			status,
			discountCode,
			deliveryOption,
		} = req.body;

		console.log(
			storeId,
			customerInfo,
			items,
			payment,
			userId,
			totalAmount,
			itemsAmount,
			runnerInfo,
			status,
			discountCode,
			deliveryOption,
		);

		// Fetch the user's wallet information from the database
		// const user = await StudentModel.findById(userId);

		// let userWalletBalance = user?.wallet || 0; // Assuming there's a `walletBalance` field in the User model

		// Fetch the number of existing orders for the store
		const orderCount = await Order.countDocuments({
			storeId: storeId,
		});

		// Generate a 5-digit invoice number, starting from 1
		const orderNumber = (orderCount + 1)
			.toString()
			.padStart(5, '0');

		// Handle wallet payment
		// if (payment.type === 'wallet') {
		// 	// Check if the user has enough wallet balance to cover the order amount
		// 	if (userWalletBalance < totalAmount) {
		// 		return res.status(400).json({
		// 			message: 'Insufficient wallet balance',
		// 		});
		// 	}

		// 	// Deduct the total amount from the user's wallet
		// 	user.wallet -= totalAmount;
		// 	await user.save(); // Save the updated wallet balance in the database
		// }

		// Generate a random 4-digit delivery code
		const deliveryCode = Math.floor(
			1000 + Math.random() * 9000,
		);

		// Create the new order
		const newOrder = new Order({
			storeId,
			customerInfo,
			items,
			payment,
			userId,
			totalAmount,
			itemsAmount,
			orderNumber,
			status, // Default order status
			runnerInfo, // Optional field for tracking runner information
			deliveryCode, // Add the delivery code to the order
			discountCode, // Add the discount code to the order
			deliveryOption, // Add the delivery option to the order
			balance: totalAmount,
		});

		await newOrder.save();

		console.log(newOrder);

		// Emit an event to the store that a new order has been placed
		io.emit('newOrder', {
			message: 'New order placed',
			order: newOrder,
		});

		res.status(201).json({
			message: 'Order placed successfully',
			order: newOrder,
			orderId: newOrder._id,
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
		io.emit('orderAccepted', {
			message: 'Order accepted by runner',
			order,
		});
		io.emit('orderAccepted', {
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

		res.status(200).json(order);
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
		io.emit('orderStatusUpdated', {
			message: `Order status updated to ${status}`,
			order,
		});
		io.emit('orderStatusUpdated', {
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

// Complete an order by vendor
export const completeOrderByVendor = async (req, res) => {
	console.log('completeOrderByVendor called');
	const { orderId } = req.params;
	const { storeId } = req.body; // Assuming storeId is in the authenticated user object

	try {
		const order = await Order.findById(orderId);

		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		if (order.status !== 'accepted') {
			return res.status(400).json({
				message:
					'Order cannot be completed in the current status',
			});
		}

		console.log(order);

		order.status = 'completed';
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

// Add a runner to an order
export const addRunner = async (req, res) => {
	const { orderId } = req.params;
	const { runnerId } = req.body;

	try {
		const order = await Order.findById(orderId);
		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		if (order.status !== 'accepted') {
			return res.status(400).json({
				message:
					'Order must be accepted by a runner before assigning a runner to it',
			});
		}

		// Update the order with runner's information
		order.runnerInfo = {
			runnerId,
			accepted: true,
			acceptedAt: new Date(),
		};
		order.status = 'in progress'; // Change status to 'in progress'

		await order.save();

		// Emit events to notify the store and customer
		io.emit('orderRunnerAssigned', {
			message: 'A runner has been assigned to your order',
			order,
		});
		io.emit('orderRunnerAssignedStore', {
			message: 'A runner has been assigned to the order',
			order,
		});

		res.status(200).json({
			message: 'Runner successfully assigned to the order',
			order,
		});
	} catch (error) {
		console.error('Error adding runner to order:', error);
		res.status(500).json({
			message: 'Error assigning runner to the order',
			error: error.message,
		});
	}
};

// Update payment
export const updatePayment = async (req, res) => {
	const { orderId } = req.params;
	const { type, status, statusUpdatedAt } = req.body;

	// Validate input
	if (!type || !status) {
		return res.status(400).json({
			message:
				'Type and status are required to update payment',
		});
	}

	try {
		// Find and update the payment details within the order
		const updatedOrder = await Order.findByIdAndUpdate(
			orderId,
			{
				$set: {
					'payment.type': type,
					'payment.status': status,
					'payment.statusUpdatedAt':
						statusUpdatedAt || new Date(),
				},
			},
			{ new: true },
		);

		if (!updatedOrder) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		// Emit an event to notify clients of the update
		io.emit('orderPaymentStatusUpdated', {
			message: 'Payment status updated for the order',
			order: updatedOrder,
		});

		return res.json({
			updatedOrder,
			message: 'Payment status updated successfully',
			statusText: 'success',
		});
	} catch (error) {
		console.error('Error updating payment:', error);
		return res.status(500).json({
			message: 'Error updating payment status',
			error: error.message,
		});
	}
};

// Add a payment
export const addPayment = async (req, res) => {
	try {
		const { orderId, amount, method } = req.body;

		// Validate input
		if (!orderId || !amount || !method) {
			return res
				.status(400)
				.json({ message: 'All fields are required.' });
		}

		// Find the order
		const order = await Order.findById(orderId);
		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found.' });
		}

		console.log(order);

		// Add payment record
		const payment = {
			amount: Number(amount),
			method,
			date: new Date(),
		};
		order.payments.push(payment);

		order.amountPaid =
			Number(order.amountPaid) + Number(amount);
		order.balance = Number(order.balance) - Number(amount);

		// Update payment status if fully paid
		const totalPaid = order.payments.reduce(
			(sum, p) => sum + Number(p.amount),
			0,
		);

		if (totalPaid >= Number(order.totalAmount)) {
			order.payment.status = 'completed';
			order.payment.statusUpdatedAt = new Date();
		} else {
			order.payment.status = 'partial';
			order.payment.statusUpdatedAt = new Date();
		}

		await order.save();

		res.status(200).json({
			message: 'Payment added successfully.',
			order,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};


// Get payment history
export const getPaymentHistory = async (req, res) => {
	try {
		const { orderId } = req.params;

		// Find the order
		const order = await Order.findById(orderId).select(
			'payments',
		);
		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found.' });
		}

		res.status(200).json({ payments: order.payments });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
