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
} from '../controllers/orderController.js';

const router = Router();

router.post('/', createOrder);
router.put('/:orderId/accept', acceptOrder);
router.get('/', getAllOrders);
router.get('/:orderId', getOrderById);
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

export default router;
