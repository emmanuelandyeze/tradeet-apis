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
} from '../controllers/businessController.js';

const router = express.Router();

// Route to find businesses by service type and campus
router.get('/', findBusinessesByServiceTypeAndCampus);
router.get('/:businessId', findBusinessAndProductsById);
router.get('/b/:businessId', findBusinessById);
router.get('/:businessId/payment', getPaymentInfo);
router.post('/:businessId/payment', addPaymentInfo);

// Subscription routes
router.put('/:businessId/subscription', updateSubscription);
router.get(
	'/:businessId/subscription',
	getSubscriptionInfo,
);
router.put('/:businessId', updateBusinessInfo);

export default router;
