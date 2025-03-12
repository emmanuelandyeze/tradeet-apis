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
	addRunner,
	updatePayment,
	addPayment,
	getPaymentHistory,
	processTransfer,
} from '../controllers/orderController.js';

const router = Router();

router.post('/', createOrder);
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

router.put('/orders/:orderId/add-runner', addRunner);

router.post('/add-payment', addPayment); // Add a payment 
router.get('/:orderId/payments', getPaymentHistory); // Get payment history

router.post('/process-transfer', processTransfer);


export default router; 
