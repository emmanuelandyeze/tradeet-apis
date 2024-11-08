// routes/deliveryRequestRoutes.js
import express from 'express';
import {
	createDeliveryRequest,
	acceptDeliveryRequest,
	rejectDeliveryRequest,
	getDeliveryRequestsForRunner,
	getDeliveryRequestStatus,
} from '../controllers/deliveryRequestController.js';

const router = express.Router();

// Route to create a delivery request
router.post('/create', createDeliveryRequest);

// Route to accept a delivery request
router.post('/accept', acceptDeliveryRequest);

// Route to reject a delivery request
router.post('/reject', rejectDeliveryRequest);

// Route to get delivery requests for a specific runner
router.get(
	'/runner/:runnerId',
	getDeliveryRequestsForRunner,
);

router.get('/status/:requestId', getDeliveryRequestStatus);

export default router;
