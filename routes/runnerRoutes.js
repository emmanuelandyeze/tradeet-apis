import express from 'express';
import {
	getAvailableRunners,
	getOrdersForRunner,
	getRunnerTransactions,
	markOrderAsDelivered,
	runnerInfo,
	toggleRunnerActiveStatus,
} from '../controllers/runnerController.js';

const router = express.Router();

// Define a route to fetch a runner's transactions
router.get(
	'/:runnerId/transactions',
	getRunnerTransactions,
);
router.get('/available', getAvailableRunners);
router.get('/:runnerId', runnerInfo);
router.patch(
	'/:runnerId/toggleActive',
	toggleRunnerActiveStatus,
);
router.get('/orders/:runnerId', getOrdersForRunner);
router.post(
	'/:runnerId/order/:orderId/delivered',
	markOrderAsDelivered,
);

export default router;
