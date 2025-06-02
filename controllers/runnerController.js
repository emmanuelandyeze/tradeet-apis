import axios from 'axios';
import Runner from '../models/Runner.js';
import { io } from '../server.js';
import Order from '../models/Order.js';

// Get Runner Info
export const runnerInfo = async (req, res) => {
	const { runnerId } = req.params;
	try {
		const runner = await Runner.findById(runnerId);
		if (!runner) {
			throw new Error('Runner not found');
		}

		res.status(200).json({
			runner,
		});
	} catch {
		res
			.status(500)
			.json({ success: false, error: 'Server error' });
	}
};

// Add a new transaction to a runner's wallet
export const addTransaction = async (req, res) => {
	const { runnerId, transactionData } = req.body;
	try {
		const runner = await Runner.findById(runnerId);
		if (!runner) {
			throw new Error('Runner not found');
		}

		// Add the transaction to the runner's transactions array
		runner.transactions.push(transactionData);

		// Update the runner's wallet balance if necessary
		if (transactionData.type === 'earning') {
			runner.wallet += transactionData.amount;
		} else if (transactionData.type === 'withdrawal') {
			runner.wallet -= transactionData.amount;
		}

		await runner.save();
		return runner;
	} catch {
		res
			.status(500)
			.json({ success: false, error: 'Server error' });
	}
};

// Get a runner's transactions
export const getRunnerTransactions = async (req, res) => {
	const { runnerId } = req.params; // Expecting the runner's ID to be passed as a route parameter

	try {
		const runner = await Runner.findById(
			runnerId,
			'transactions',
		); // Only fetch transactions

		if (!runner) {
			return res
				.status(404)
				.json({ message: 'Runner not found' });
		}

		res.status(200).json({
			transactions: runner.transactions,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: 'Server error',
			error: error.message,
		});
	}
};

export const toggleRunnerActiveStatus = async (
	req,
	res,
) => {
	try {
		const { runnerId } = req.params;
		console.log(runnerId);

		const runner = await Runner.findById(runnerId);
		if (!runner) {
			return res
				.status(404)
				.json({ message: 'Runner not found' });
		}

		// Toggle the runner's availability
		runner.isActive = !runner.isActive;
		await runner.save();

		// Emit the updated runner status to clients
		io.emit('runnerStatusUpdated', {
			runnerId,
			isActive: runner.isActive,
		});

		console.log(runner);

		res.json({
			message: `Runner availability toggled to ${runner.isActive}`,
			runner,
		});
	} catch (error) {
		res.status(500).json({
			message: 'Error toggling runner status',
			error: error.message,
		});
	}
};

// Fetch available runners
export const getAvailableRunners = async (req, res) => {
	try {
		// Get campus from query parameters
		const { campus } = req.query;

		// if (!campus) {
		// 	return res
		// 		.status(400)
		// 		.json({ message: 'Campus is required' });
		// }

		// Find runners that are active, approved, and in the specified campus
		const runners = await Runner.find({
			isActive: true,
			isApproved: true,
			// campus: campus,
		});

		// Respond with the filtered runners
		res.json(runners);

		// Emit available runners to clients in real time
		io.emit('availableRunners', runners);
	} catch (error) {
		res.status(500).json({
			message: 'Error fetching available runners',
			error: error.message,
		});
	}
};

// Fetch all orders for a specific runner
export const getOrdersForRunner = async (req, res) => {
	const { runnerId } = req.params; // Expecting the runner ID in the route parameter

	try {
		// Find all orders where the runnerInfo.runnerId matches the specified runner ID
		const orders = await Order.find({
			'runnerInfo.runnerId': runnerId,
		}).populate('storeId');

		// Check if any orders were found
		if (!orders.length) {
			return res.status(404).json({
				message: 'No orders found for this runner',
			});
		}

		// Respond with the found orders
		res.status(200).json({
			success: true,
			count: orders.length,
			data: orders,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: 'Error fetching orders for runner',
			error: error.message,
		});
	}
};

// Mark an order as delivered by a runner
export const markOrderAsDelivered = async (req, res) => {
	const { runnerId, orderId } = req.params;
	const { deliveryCode } = req.body;

	console.log(runnerId, orderId, deliveryCode);

	try {
		// Find the order by ID and check if the runner matches
		const order = await Order.findOne({
			_id: orderId,
			'runnerInfo.runnerId': runnerId,
		});

		if (!order) {
			return res.status(404).json({
				message:
					'Order not found or does not belong to this runner',
			});
		}

		// Check if the delivery code matches
		if (order.deliveryCode !== deliveryCode) {
			return res.status(400).json({
				message: 'Invalid delivery code',
			});
		}

		// Update the order status to "completed"
		order.status = 'completed';
		await order.save();

		// Add the order's price to the runner's wallet
		const runner = await Runner.findById(runnerId);
		if (!runner) {
			return res
				.status(404)
				.json({ message: 'Runner not found' });
		}

		runner.wallet += order?.runnerInfo?.price; // Assuming itemsAmount is the runner's earning for this order
		await runner.save();

		// Notify clients that the order has been delivered
		io.emit('orderDelivered', {
			message: 'Order marked as delivered',
			orderId,
			runnerId,
		});

		res.status(200).json({
			message:
				'Order marked as delivered and runner credited',
			order,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: 'Error marking order as delivered',
			error: error.message,
		});
	}
};
