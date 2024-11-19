import express from 'express';
import {
	createDiscount,
	getDiscountsByBusiness,
	updateDiscount,
	deleteDiscount,
	validateDiscountCode,
} from '../controllers/discountController.js';

const router = express.Router();

// Create a new discount
router.post('/', createDiscount);

// Get all discounts for a specific business
router.get('/:businessId', getDiscountsByBusiness);

// Update a discount (active/inactive toggle or percentage change)
router.put('/:discountId', updateDiscount);

// Delete a discount
router.delete('/:discountId', deleteDiscount);

// POST route for validating discount code
router.post('/validate', validateDiscountCode);

export default router;
