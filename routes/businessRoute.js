import express from 'express';
import { findBusinessesByServiceTypeAndCampus } from '../controllers/businessController.js';

const router = express.Router();

// Route to find businesses by service type and campus
router.get('/', findBusinessesByServiceTypeAndCampus);

export default router;
