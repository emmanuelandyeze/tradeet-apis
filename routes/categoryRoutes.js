import express from 'express';
import {
	getCategoriesByStore,
	getCategoryById,
	createCategory,
	updateCategory,
	deleteCategory,
} from '../controllers/categoryController.js';

const router = express.Router();

router.get('/:storeId', getCategoriesByStore); // Get categories for a store
router.get('/:id', getCategoryById); // Get category by ID
router.post('/:storeId', createCategory); // Create category for a store
router.put('/:id', updateCategory); // Update category
router.delete('/:id', deleteCategory); // Delete category

export default router;
 