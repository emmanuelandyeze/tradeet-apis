// routes/productRoutes.js
import express from 'express';
import {
	getProducts,
	getProductById,
	getProductsByStore,
	createProduct,
	updateProduct,
	deleteProduct,
	updateVariant,
	deleteVariant,
	updateAddon,
	deleteAddon,
	getProductsByCategorySlug,
} from '../controllers/productController.js';

const router = express.Router();

// Product routes
router.get('/', getProducts);
router.get('/store/:storeId', getProductsByStore);
router.get(
	'/store/:storeId/categories/:slug/products',
	getProductsByCategorySlug,
);
router.get('/:id', getProductById); 
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Variant routes
router.put(
	'/:productId/variants/:variantId',
	updateVariant,
);
router.delete(
	'/:productId/variants/:variantId',
	deleteVariant,
);

// Add-on routes
router.put(
	'/products/:productId/addons/:addonId',
	updateAddon,
);
router.delete('/:productId/addons/:addonId', deleteAddon);

export default router;
