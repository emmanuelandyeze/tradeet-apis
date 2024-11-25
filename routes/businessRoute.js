import express from 'express';
import {
	findBusinessesByServiceTypeAndCampus,
	findBusinessAndProductsById,
	findBusinessById,
	updateSubscription,
	getSubscriptionInfo,
	getPaymentInfo,
	addPaymentInfo,
	updateBusinessInfo,
	updateExpoToken,
	markOrderAsDelivered,
	findBusinessByStoreLink,
	findBusinessProducts,
} from '../controllers/businessController.js';

const router = express.Router();

// Route to find businesses by service type and campus
router.get('/', findBusinessesByServiceTypeAndCampus);
router.get('/:businessId', findBusinessAndProductsById);
router.get('/store/:storeLink', findBusinessByStoreLink);
router.get('/products/:businessId', findBusinessProducts);
router.get('/b/:businessId', findBusinessById);
router.get('/:businessId/payment', getPaymentInfo);
router.post('/:businessId/payment', addPaymentInfo);
router.post(
	'/:businessId/order/:orderId/delivered',
	markOrderAsDelivered,
);

// Subscription routes
router.put('/:businessId/subscription', updateSubscription);
router.get(
	'/:businessId/subscription',
	getSubscriptionInfo,
);
router.put('/:businessId', updateBusinessInfo);
router.put('/:businessId/expo-token', updateExpoToken);

export default router; 
