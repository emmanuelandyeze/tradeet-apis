import express from 'express';
import {
	findBusinessesByServiceTypeAndCampus,
	findBusinessAndProductsById,
} from '../controllers/businessController.js';

const router = express.Router();

// Route to find businesses by service type and campus
router.get('/', findBusinessesByServiceTypeAndCampus);
router.get('/:businessId', findBusinessAndProductsById);

export default router;
