import { Router } from 'express';
import {
	createOrder,
	acceptOrder,
	getAllOrders,
	getOrderById,
	updateOrderStatus,
	cancelOrder,
	getOrdersForStore,
	getIncomingOrdersForRunner,
	getAcceptedOrdersForRunner,
	getOrdersByUserId,
	acceptOrderByVendor,
	cancelOrderByVendor,
	completeOrderByVendor,
	updatePayment,
	addPayment,
	getPaymentHistory,
	processTransfer,
	verifyPaystackWebhook,
	handlePaystackWebhook,
	assignRunnerToOrder,
} from '../controllers/orderController.js';
import Order from '../models/Order.js';

const router = Router();

router.post('/', createOrder);
// Route to assign a runner to an order
router.post('/:orderId/assign-runner', assignRunnerToOrder); // Add any necessary authentication/authorization middleware here

router.put('/:orderId/accept', acceptOrder);
router.get('/', getAllOrders);
router.get('/:orderId', getOrderById);
router.put('/:orderId/pay', updatePayment);
router.put('/:orderId/status', updateOrderStatus);
router.delete('/:orderId', cancelOrder);
router.get('/store/:storeId', getOrdersForStore); // Get orders for a specific store
router.get(
	'/runner/:runnerId/incoming',
	getIncomingOrdersForRunner,
); // Get incoming orders for a runner
router.get(
	'/runner/:runnerId/accepted',
	getAcceptedOrdersForRunner,
); // Get accepted orders for a runner
router.get('/user/:userId', getOrdersByUserId);

// Store actions on orders
router.put('/v/:orderId/accept', acceptOrderByVendor); // Accept an order 
router.put('/v/:orderId/cancel', cancelOrderByVendor); // Cancel an order
router.put('/v/:orderId/complete', completeOrderByVendor); // Cancel an order

// router.put('/orders/:orderId/add-runner', addRunner);

router.post('/add-payment', addPayment); // Add a payment
router.get('/:orderId/payments', getPaymentHistory); // Get payment history

router.post('/process-transfer', processTransfer);

// routes/orderRoutes.js or similar
router.post(
	'/paystack/webhook',
	// verifyPaystackWebhook,
	handlePaystackWebhook,
);

// Get payment status for an order
router.get('/:orderId/status', async (req, res) => {
	try {
		const { orderId } = req.params;

		// Find the order
		const order = await Order.findById(orderId);
		if (!order) {
			return res
				.status(404)
				.json({ message: 'Order not found' });
		}

		// Return the payment status
		res.status(200).json({
			status: order.payment.status,
			amountPaid: order.amountPaid,
			totalAmount: order.totalAmount,
			isPaid: order.payment.status === 'completed',
			updatedAt: order.payment.statusUpdatedAt,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});


export default router; 
