import express from 'express';
import {
	findBusinessesByServiceTypeAndCampus,
	findBusinessAndProductsById,
	findBusinessById,
} from '../controllers/businessController.js';

const router = express.Router();

// Route to find businesses by service type and campus
router.get('/', findBusinessesByServiceTypeAndCampus);
router.get('/:businessId', findBusinessAndProductsById);
router.get('/b/:businessId', findBusinessById);

export default router;
