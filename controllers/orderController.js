import BusinessModel from '../models/BusinessModel.js';
import Wallet from '../models/Wallet.js';
import Order from '../models/Order.js';
import Transfer from '../models/Transfer.js';
import RunnerModel from '../models/Runner.js'; // Assuming you have a RunnerModel
import { io } from '../server.js';
import axios from 'axios';
import { Expo } from 'expo-server-sdk';
import { createHmac } from 'crypto'; // Import createHmac for Paystack webhook verification

// Create a new Expo SDK client
const expo = new Expo();

// Array to store push tickets (consider moving this to a more persistent storage for production)
const pushTickets = [];

async function sendPushNotification(
	pushToken,
	message,
	title,
	data = {}, // Added data parameter for more context
) {
	// Check if the push token is valid
	if (!Expo.isExpoPushToken(pushToken)) {
		console.error(
			`Push token ${pushToken} is not a valid Expo push token`,
		);
		return;
	}

	// Construct the notification message
	const notificationMessage = {
		to: pushToken,
		sound: 'default',
		title: title,
		body: message,
		data: data, // Use the provided data
	};

	try {
		// Send the notification
		const pushTicketChunk =
			await expo.sendPushNotificationsAsync([
				notificationMessage,
			]);
		pushTickets.push(...pushTicketChunk);
		console.log(
			'Notification sent successfully',
			pushTicketChunk,
		);
	} catch (error) {
		console.error('Error sending notification:', error);
		// Optionally, handle specific Expo errors (e.g., token invalidated)
	}
}

// --- NEW CONTROLLER FUNCTION FOR ASSIGNING RUNNER ---
export const assignRunnerToOrder = async (req, res) => {
	const { orderId } = req.params;
	const { runnerId } = req.body;

	try {
		// 1. Find the order
		const order = await Order.findById(orderId).populate(
			'storeId',
		);

		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found.' });
		}

		// 2. Verify order status
		if (
			order.status !== 'accepted' &&
			order.status !== 'pending'
		) {
			return res.status(400).json({
				message:
					'Order must be in "pending" or "accepted" status to assign a runner.',
			});
		}

		if (order.delivery?.runnerInfo?.runnerId) {
			return res.status(400).json({
				message:
					'A runner is already assigned to this order.',
			});
		}

		// Check if it's a customer pickup order
		if (order.customerInfo?.pickUp === true) {
			return res.status(400).json({
				message:
					'This is a customer pickup order; runners cannot be assigned.',
			});
		}

		// 3. Find the runner
		const runner = await RunnerModel.findById(runnerId); // Assuming you have a RunnerModel
		if (!runner) {
			return res
				.status(404)
				.json({ message: 'Runner not found.' });
		}

		// 4. Calculate delivery price (PLACEHOLDER LOGIC)
		// This is a crucial part you need to implement based on your business logic.
		// Factors could include: distance, runner's rate, time of day, etc.
		// For demonstration, let's assume a simple fixed price or a lookup.
		let deliveryPrice = 0;
		// Example: If runner has a fixed rate, or calculate based on order.deliveryFee and your business model
		// You might need to query a pricing service or a more complex calculation here.
		if (order.deliveryFee) {
			deliveryPrice =
				order.deliveryFee -
				(37.5 / 100) * Number(order.deliveryFee); // Assuming runner gets the delivery fee charged to customer
			// Or calculate based on distance, e.g.:
			// const customerAddress = order.customerInfo.address;
			// const storeAddress = order.storeId.address;
			// Calculate distance between customerAddress and storeAddress
			// deliveryPrice = calculatePriceBasedOnDistance(customerAddress, storeAddress, runner.rate);
		} else {
			// Default delivery price if none set, or based on zones/distance
			deliveryPrice = 150; // Example fixed price
		}

		// 5. Update the order with runner's information
		order.runnerInfo = {
			runnerId: runner._id,
			name: runner.name, // Assuming runner has a name field
			contact: runner.contact, // Assuming runner has a contact field
			expoPushToken: runner.expoPushToken, // Runner's push token
			accepted: false, // Runner still needs to accept the assignment from their end
			assignedAt: new Date(),
			price: deliveryPrice, // Store the calculated price for this specific assignment
			status: 'assigned', // New: Set runner-specific status
		};

		// Update order status if not already 'in progress'
		if (order.status !== 'in progress') {
			order.status = 'in progress';
		}

		await order.save();

		// 6. Send a push notification to the assigned runner
		if (runner.expoPushToken) {
			sendPushNotification(
				runner.expoPushToken,
				`You have been assigned a new delivery for order #${order.orderNumber}. Tap to view details.`,
				'New Delivery Assignment!',
				{
					orderId: order._id.toString(),
					type: 'newAssignment',
				}, // Include orderId in data
			);
		}

		// 7. Emit a Socket.IO event for real-time updates
		// To the specific runner (if they are connected)
		io.to(runner._id.toString()).emit(
			'newRunnerAssignment',
			{
				message: `You have a new delivery assignment: Order #${order.orderNumber}`,
				order: order,
			},
		);
		// To the store that assigned the runner
		io.to(order.storeId._id.toString()).emit(
			'orderRunnerAssigned',
			{
				message: `Runner ${runner.name} assigned to Order #${order.orderNumber}`,
				order: order,
			},
		);

		res.status(200).json({
			message: 'Runner successfully assigned to order.',
			order: order,
		});
	} catch (error) {
		console.error(
			'Error assigning runner to order:',
			error,
		);
		res.status(500).json({
			message: 'Failed to assign runner to order.',
			error: error.message,
		});
	}
};

// ... (rest of your existing order controller code) ...

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
			// runnerInfo, // Remove runnerInfo from direct creation, it's assigned later
			status,
			discountCode,
			deliveryOption,
			deliveryFee,
			serviceFee,
			discountAmount,
			scheduledTime,
		} = req.body;

		// Fetch the user's wallet information from the database
		const store = await BusinessModel.findById(storeId);

		// let userWalletBalance = user?.wallet || 0; // Assuming there's a `walletBalance` field in the User model

		// Fetch the number of existing orders for the store
		const orderCount = await Order.countDocuments({
			storeId: storeId,
		});

		// Generate a 5-digit invoice number, starting from 1
		const orderNumber = (orderCount + 1)
			.toString()
			.padStart(5, '0');

		// Generate a random 4-digit delivery code
		const deliveryCode = Math.floor(
			1000 + Math.random() * 9000,
		);

		const paystackReference = `TRADEET_${Date.now()}_${Math.floor(
			Math.random() * 1000,
		)}`;

		const safeNumber = (value) => Number(value) || 0;

		const balance =
			safeNumber(itemsAmount) +
			safeNumber(deliveryFee) -
			safeNumber(discountAmount);

		// Create the new order
		const order = new Order({
			storeId,
			customerInfo,
			items,
			payment,
			userId,
			totalAmount,
			itemsAmount,
			orderNumber,
			status,
			// runnerInfo, // No runnerInfo on initial creation
			deliveryCode,
			discountCode,
			deliveryOption,
			balance,
			deliveryFee,
			serviceFee,
			discountAmount,
			paystackReference,
			scheduledTime,
			// Initialize delivery field, type will be 'customer_pickup' if applicable, otherwise null/undefined
			delivery:
				customerInfo?.pickUp === true
					? { type: 'customer_pickup' }
					: { type: 'unassigned' },
		});

		await order.save();

		const userPushToken = store?.expoPushToken; // Replace with the actual push token
		const notificationMessage = `You have a new order on ${store?.name} `;
		const title = 'New Order';

		sendPushNotification(
			userPushToken,
			notificationMessage,
			title,
		);

		const formatCartItems = (order) => {
			const cartItems = order?.items
				?.map((item) => {
					const itemPrice = item?.variant
						? `${
								item?.variant?.name
						  } - ₦${new Intl.NumberFormat('en-US').format(
								item?.variant?.price,
						  )}`
						: `₦${new Intl.NumberFormat('en-US').format(
								item?.basePrice,
						  )}`;

					// Check for additions within the item and format them
					const additions =
						item?.addOns
							?.map((addition) => {
								return `+ ${
									addition.name
								} - ₦${new Intl.NumberFormat(
									'en-US',
								).format(addition.price)}`;
							})
							.join(' ') || '';

					return `*${item.quantity}x* ${item.name} - ${itemPrice} ${additions}`;
				})
				.join(' / '); // Use '/' to separate items

			return cartItems;
		};

		console.log('order: ', order);
		console.log('formattedOrder: ', formatCartItems(order));

		// Send WhatsApp message
		const sendMessage = async () => {
			const accessToken = process.env.FB_SECRET;
			const url =
				'https://graph.facebook.com/v21.0/432799279914651/messages';

			try {
				const response = await axios.post(
					url,
					{
						messaging_product: 'whatsapp',
						to: store?.phone,
						type: 'template',
						template: {
							name: 'new_order',
							language: {
								code: 'en_US',
							},
							components: [
								{
									type: 'header',
									parameters: [
										{
											type: 'text',
											text: 'New',
										},
									],
								},
								{
									type: 'body',
									parameters: [
										{
											type: 'text',
											text: formatCartItems(order),
										},
										{
											type: 'text',
											text: `₦${order.totalAmount.toLocaleString()}.00 (Qty: ${
												order.items.length
											})`,
										},
										{
											type: 'text',
											text: `₦${order.totalAmount.toLocaleString()}.00`,
										},
										{
											type: 'text',
											text: `${order.customerInfo.name} / ${order.customerInfo.contact}`,
										},
										{
											type: 'text',
											text: `${
												order?.customerInfo.pickUp
													? 'Self pickup'
													: 'Delivery'
											}`,
										},
										{
											type: 'text',
											text: `https://tradeet.ng/store/${store?.storeLink}/orders/${order._id}`,
										},
										{
											type: 'text',
											text: `${order.customerInfo.contact}`,
										},
									],
								},
								{
									type: 'button',
									sub_type: 'quick_reply', // Use 'quick_reply'
									index: '0',
									parameters: [
										{
											type: 'payload',
											payload: `CONFIRM_PAYMENT_${order._id}`, // Unique payload for backend to identify action
										},
									],
								},
							],
						},
					},
					{
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
						},
					},
				);
				console.log(
					'WhatsApp message sent successfully:',
					response.data,
				);
			} catch (error) {
				console.error(
					'Error sending WhatsApp message:',
					error.response
						? error.response.data
						: error.message,
				);
			}
		};

		sendMessage();

		res.status(201).json({
			message: 'Order placed successfully',
			order: order,
			orderId: order._id,
		});
	} catch (error) {
		res.status(500).json({
			message: 'Error placing order',
			error: error.message,
		});
	}
};

// Middleware to verify Paystack webhook
export const verifyPaystackWebhook = (req, res, next) => {
	const secret = process.env.PAYSTACK_WEBHOOK_SECRET;

	if (!secret) {
		return res.status(500).json({
			error: 'Webhook secret not configured',
		});
	}

	const hash = createHmac('sha512', secret)
		.update(JSON.stringify(req.body))
		.digest('hex');

	if (hash !== req.headers['x-paystack-signature']) {
		return res.status(401).json({
			error: 'Invalid webhook signature',
		});
	}

	next();
};

// Webhook handler
export const handlePaystackWebhook = async (req, res) => {
	console.log('=== INCOMING WEBHOOK ===');
	console.log('Headers:', req.headers);
	console.log('Raw Body:', req.body);

	const event = req.body;

	if (!event) {
		console.error('No event payload received');
		return res
			.status(400)
			.json({ error: 'No event payload' });
	}

	console.log(
		`Processing event type: ${event.event || 'unknown'}`,
	);

	if (event.event === 'charge.success') {
		console.log('Processing successful charge event');
		const { reference, amount, metadata } = event.data;

		try {
			console.log(
				`Looking for order with reference: ${reference}`,
			);

			// Find order by reference
			const order = await Order.findOne({
				paystackReference: reference,
			});

			if (!order) {
				console.error(
					`Order not found for reference: ${reference}`,
				);
				return res.status(404).json({
					message: 'Order not found',
					reference,
					eventId: event.id,
				});
			}

			console.log(
				`Found order ${order._id} with current status: ${order.payment.status}`,
			);

			// Check if payment already processed
			if (order.payment.status === 'completed') {
				console.log(
					`Order ${order._id} already marked as completed`,
				);
				return res.status(200).json({
					message: 'Payment already processed',
					orderId: order._id,
				});
			}

			// Process payment
			const payment = {
				amount: amount / 100,
				method: 'paystack',
				date: new Date(),
				paystackEventId: event.id,
			};

			console.log(
				`Adding payment of ${payment.amount} to order ${order._id}`,
			);

			order.payments.push(payment);
			order.amountPaid =
				Number(order.amountPaid) + payment.amount;
			order.balance =
				Number(order.balance) - payment.amount;

			// Update payment status
			const totalPaid = order.payments.reduce(
				(sum, p) => sum + Number(p.amount),
				0,
			);
			const newStatus =
				totalPaid >= Number(order.totalAmount)
					? 'completed'
					: 'partial';

			console.log(
				`Updating status from ${order.payment.status} to ${newStatus}`,
			);

			order.payment.status = newStatus;
			order.payment.statusUpdatedAt = new Date();

			// Save order
			await order.save();
			console.log(
				`Order ${order._id} successfully updated`,
			);

			// Add wallet update logic here
			console.log('Proceeding to update vendor wallet...');
			// ... rest of your wallet update logic ...

			return res.status(200).json({
				success: true,
				message: 'Payment processed successfully',
				orderId: order._id,
				newStatus,
			});
		} catch (error) {
			console.error('WEBHOOK PROCESSING ERROR:', {
				error: error.message,
				stack: error.stack,
				reference,
				event,
			});
			return res.status(500).json({
				error: 'Webhook processing failed',
				details: error.message,
			});
		}
	}

	console.log(`Unhandled event type: ${event.event}`);
	return res.status(200).json({
		message: 'Event not handled',
		eventType: event.event,
	});
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
			.populate('runnerInfo.runnerId'); // Populate runnerInfo.runnerId for full runner details

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
			status: 'pending', // Only show pending orders not assigned to this runner
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
			'delivery.runnerInfo.runnerId': runnerId, // Use the new delivery.runnerInfo field
			'delivery.runnerInfo.accepted': true, // Make sure the runner has explicitly accepted it
		})
			.populate('storeId')
			.populate('delivery.runnerInfo.runnerId'); // Populate the correct path

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
	// const { storeId } = req.body; // storeId should come from authentication middleware in a real app

	try {
		const order = await Order.findById(orderId);

		console.log('I am here!');
		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		// Add proper authorization check here, e.g., if (order.storeId.toString() !== req.user.storeId.toString())
		// if (order.storeId.toString() !== storeId.toString()) {
		//   return res.status(403).json({
		//       message:
		//           'You are not authorized to accept this order',
		//   });
		// }

		if (order.status !== 'pending') {
			return res.status(400).json({
				message:
					'Order cannot be accepted in the current status (must be pending).',
			});
		}

		order.status = 'accepted';
		await order.save();

		io.emit('orderUpdate', order); // Emit the updated order
		console.log('Order update emitted successfully');

		res.status(200).json({
			message: 'Order accepted successfully',
			order,
		});
	} catch (error) {
		res.status(500).json({
			message: 'Server error',
			error: error.message,
		});
	}
};

// Cancel an order by vendor
export const cancelOrderByVendor = async (req, res) => {
	const { orderId } = req.params;
	// const { storeId } = req.body; // storeId should come from authentication middleware

	try {
		const order = await Order.findById(orderId);

		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		// Add proper authorization check here
		// if (order.storeId.toString() !== storeId.toString()) {
		//   return res.status(403).json({
		//       message:
		//           'You are not authorized to cancel this order',
		//   });
		// }

		if (
			order.status !== 'pending' &&
			order.status !== 'accepted' &&
			order.status !== 'in progress'
		) {
			// Allow cancellation from 'in progress' too
			return res.status(400).json({
				message:
					'Order cannot be canceled in the current status.',
			});
		}

		order.status = 'cancelled';
		await order.save();

		io.emit('orderUpdate', order); // Emit the order cancellation via socket

		res.status(200).json({
			message: 'Order canceled successfully',
			order,
		});
	} catch (error) {
		res.status(500).json({
			message: 'Server error',
			error: error.message,
		});
	}
};

// Complete an order by vendor
export const completeOrderByVendor = async (req, res) => {
	console.log('completeOrderByVendor called');
	const { orderId } = req.params;
	const { deliveryCode } = req.body; // Expecting deliveryCode for verification

	try {
		const order = await Order.findById(orderId);

		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		// Check if the order is ready for completion based on its state and delivery type
		const isCustomerPickup =
			order.customerInfo?.pickUp === true;
		const isSelfDelivery = order.delivery?.type === 'self';
		const isAssignedDelivery =
			order.delivery?.type === 'assigned' &&
			order.delivery?.runnerInfo?.runnerId;

		if (
			order.status !== 'accepted' &&
			order.status !== 'in progress'
		) {
			return res.status(400).json({
				message:
					'Order cannot be completed in the current status. It must be accepted or in progress.',
			});
		}

		// Verify delivery code for all applicable delivery types
		if (
			(isCustomerPickup ||
				isSelfDelivery ||
				isAssignedDelivery) &&
			order.deliveryCode !== deliveryCode
		) {
			return res.status(400).json({
				message: 'Invalid delivery verification code.',
			});
		}

		order.status = 'completed';
		// Set completion timestamp
		order.completedAt = new Date();
		await order.save();

		io.emit('orderUpdate', order); // Emit the updated order
		console.log('Order update emitted successfully');

		res.status(200).json({
			message: 'Order completed successfully',
			order,
		});
	} catch (error) {
		res.status(500).json({
			message: 'Server error',
			error: error.message,
		});
	}
};

// Removed the old addRunner, now using assignRunnerToOrder
// export const addRunner = async (req, res) => { /* ... */ };

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

// Helper function to get bank code from bank name
const getBankCode = async (bankName) => {
	// This function typically needs to fetch from an external API (like Paystack's list banks API)
	// For a real application, you might want to cache this list or use a more robust lookup.
	try {
		const banksResponse = await axios.get(
			'https://api.paystack.co/bank',
			{
				headers: {
					Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`, // Your Paystack secret key
				},
			},
		);
		const banks = banksResponse.data.data;
		const bank = banks.find(
			(bank) =>
				bank.name.toLowerCase() === bankName.toLowerCase(),
		);
		return bank ? bank.code : null;
	} catch (error) {
		console.error(
			'Error fetching bank codes from Paystack:',
			error.response?.data || error.message,
		);
		return null;
	}
};

// Add a payment (this seems to be for manual payment confirmation, or for the platform crediting the vendor)
export const addPayment = async (req, res) => {
	try {
		const { storeId, orderId, amount, method } = req.body;

		// Validate input
		if (!orderId || !amount || !method) {
			return res
				.status(400)
				.json({ message: 'All fields are required.' });
		}

		// Fetch the store (vendor)
		const store = await BusinessModel.findById(storeId);
		if (!store) {
			return res
				.status(404)
				.json({ message: 'Store not found.' });
		}

		// Find the order
		const order = await Order.findById(orderId);
		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found.' });
		}

		// Add payment record to order
		const payment = {
			amount: Number(amount),
			method,
			date: new Date(),
		};
		order.payments.push(payment);
		order.amountPaid =
			Number(order.amountPaid) + Number(amount);
		order.balance = Number(order.balance) - Number(amount);

		// Update payment status
		const totalPaid = order.payments.reduce(
			(sum, p) => sum + Number(p.amount),
			0,
		);
		if (totalPaid >= Number(order.totalAmount)) {
			order.payment.status = 'completed';
		} else {
			order.payment.status = 'partial';
		}
		order.payment.statusUpdatedAt = new Date();

		// Calculate vendor's earnings from this order
		const itemsAmount = order.itemsAmount || 0;
		const deliveryFee = order.deliveryFee || 0;
		const discountAmount = order.discountAmount || 0;
		const serviceFee = (itemsAmount * 10) / 100; // Assuming 10% platform fee

		const vendorEarnings =
			itemsAmount + deliveryFee - discountAmount;
		const vendorReceivable = Math.min(
			vendorEarnings,
			order.amountPaid,
		); // Vendor receives up to what's paid for the items and delivery

		// Update vendor's wallet
		let wallet = await Wallet.findOne({ storeId });

		if (!wallet) {
			// Create a new wallet if not exists
			wallet = new Wallet({
				storeId,
				balance: 0,
				transactions: [],
			});
		}

		// Add earnings to wallet balance
		wallet.balance += vendorReceivable;
		wallet.transactions.push({
			amount: vendorReceivable,
			type: 'credit',
			reference: `PAYMENT_${orderId}`,
			description: `Payment received for order ${order.orderNumber}`, // Use orderNumber for clarity
			date: new Date(),
		});

		// Save updated wallet and order
		await order.save();
		await wallet.save();

		const userPushToken = store?.expoPushToken; // Replace with the actual push token
		const notificationMessage = `You have a new payment of ₦${vendorReceivable.toLocaleString()} added to your wallet. `;
		const title = 'New Payment';

		sendPushNotification(
			userPushToken,
			notificationMessage,
			title,
		);

		res.status(200).json({
			message:
				'Payment added successfully, and wallet updated.',
			order,
			walletBalance: wallet.balance,
		});
	} catch (error) {
		console.error('Error in addPayment:', error);
		res.status(500).json({ message: error.message });
	}
};

// Get payment history (for a specific order, or for a vendor's wallet transactions?)
// This currently fetches order-specific payments. If it's for wallet history, it would be wallet.transactions
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

export const processTransfer = async (req, res) => {
	try {
		const {
			storeId,
			amount,
			bankCode,
			accountName,
			accountNumber,
		} = req.body;

		// Validate inputs
		if (
			!storeId ||
			!amount ||
			!bankCode ||
			!accountName ||
			!accountNumber
		) {
			return res
				.status(400)
				.json({ message: 'All fields are required.' });
		}

		const store = await BusinessModel.findById(storeId);
		if (!store) {
			return res
				.status(404)
				.json({ message: 'Store not found.' });
		}

		// Fetch vendor's wallet
		let wallet = await Wallet.findOne({ storeId });

		if (!wallet) {
			return res
				.status(400)
				.json({ message: 'Vendor wallet not found.' });
		}

		// Paystack transfer fee logic (Vendor bears this fee)
		const transferFee = amount <= 5000 ? 10 : 25; // Example fee
		const totalDeduction =
			Number(amount) + Number(transferFee); // Total amount to deduct from wallet

		// Ensure wallet has enough balance
		if (wallet.balance < totalDeduction) {
			return res
				.status(400)
				.json({ message: 'Insufficient wallet balance.' });
		}

		// Paystack Transfer API endpoint
		const paystackUrl = 'https://api.paystack.co/transfer';

		// Step 1: Create a transfer recipient (if not already created)
		// In a real app, you'd check if a recipient already exists for this bank account
		// and reuse it to avoid creating duplicates.
		const recipientResponse = await axios.post(
			'https://api.paystack.co/transferrecipient',
			{
				type: 'nuban',
				name: accountName,
				account_number: accountNumber,
				bank_code: bankCode,
				currency: 'NGN',
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
					'Content-Type': 'application/json',
				},
			},
		);

		const recipientCode =
			recipientResponse.data?.data?.recipient_code;

		if (!recipientCode) {
			console.error(
				'Paystack recipient creation failed:',
				recipientResponse.data,
			);
			return res.status(400).json({
				message:
					'Failed to create transfer recipient with Paystack.',
				details:
					recipientResponse.data?.message ||
					'Unknown Paystack error.',
			});
		}

		// Step 2: Initiate the transfer
		const transferResponse = await axios.post(
			paystackUrl,
			{
				source: 'balance',
				amount: amount * 100, // Convert to kobo
				recipient: recipientCode,
				reason: `Vendor payout for ${store.name}`,
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
					'Content-Type': 'application/json',
				},
			},
		);

		if (!transferResponse.data.status) {
			console.error(
				'Paystack transfer initiation failed:',
				transferResponse.data,
			);
			return res.status(400).json({
				message:
					'Failed to initiate transfer with Paystack.',
				details:
					transferResponse.data?.message ||
					'Unknown Paystack error.',
			});
		}

		// Deduct the total amount (transfer + fee) from wallet
		wallet.balance -= totalDeduction;
		wallet.transactions.push({
			amount: totalDeduction,
			type: 'debit',
			reference: transferResponse.data?.data?.reference,
			description: `Transfer to ${accountName} (${accountNumber})`,
			date: new Date(),
		});

		await wallet.save();

		// Save transfer record to the database
		const transferData = new Transfer({
			storeId,
			amount, // The vendor receives this amount
			bankCode,
			accountName,
			accountNumber,
			transferFee,
			status: transferResponse.data?.data?.status,
			transferReference:
				transferResponse.data?.data?.reference,
		});

		await transferData.save();

		const userPushToken = store?.expoPushToken;
		const notificationMessage = `You have made a transfer of ₦${amount.toLocaleString()} to ${accountName}. Your new wallet balance is ₦${wallet.balance.toLocaleString()}.`;
		const title = 'Successful Transfer Initiated';

		sendPushNotification(
			userPushToken,
			notificationMessage,
			title,
		);

		res.status(200).json({
			success: true,
			message: 'Transfer successful',
			transferDetails: transferResponse.data.data,
			newWalletBalance: wallet.balance,
		});
	} catch (error) {
		console.error(
			'Error processing transfer:',
			error.response?.data || error.message,
		);
		res.status(500).json({
			message: 'Error processing transfer',
			error: error.response?.data?.message || error.message,
		});
	}
};
