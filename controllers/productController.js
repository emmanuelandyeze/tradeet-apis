// controllers/productController.js
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';

// Get all products
export const getProducts = async (req, res) => {
	try {
		// Fetch products and populate the storeId field
		const products = await Product.find().populate(
			'storeId',
		);
		res.status(200).json(products);
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Failed to fetch products', error });
	}
};

// Get a single product by ID
export const getProductById = async (req, res) => {
	const { id } = req.params;
	try {
		const product = await Product.findById(id).populate(
			'category',
		);
		if (!product) {
			return res
				.status(404)
				.json({ message: 'Product not found' });
		}
		res.status(200).json(product);
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Failed to fetch product', error });
	}
};

// Get products by store ID
export const getProductsByStore = async (req, res) => {
	const { storeId } = req.params;
	const { categoryId } = req.query; // Optional category filter
	try {
		const filter = { storeId };
		if (categoryId) {
			filter.category = categoryId;
		}

		const products = await Product.find(filter).populate(
			'category',
		);
		res.status(200).json(products);
	} catch (error) {
		res.status(500).json({
			message: 'Failed to fetch products for the store',
			error,
		});
	}
};

// Create a new product
export const createProduct = async (req, res) => {
	const {
		name,
		price,
		image,
		variants,
		addOns,
		description,
		category, // Category ID
		storeId,
	} = req.body;
	try {
		// Validate that the category belongs to the store
		const existingCategory = await Category.findOne({
			_id: category,
			storeId,
		});
		if (!existingCategory) {
			return res.status(400).json({
				message: 'Invalid category ID for this store',
			});
		}

		const newProduct = new Product({
			name,
			price,
			image,
			variants,
			addOns,
			description,
			category,
			storeId,
		});
		await newProduct.save();

		res.status(201).json(newProduct);
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Failed to create product', error });
	}
};

// Update an existing product
export const updateProduct = async (req, res) => {
	const { id } = req.params; // Product ID
	const {
		name,
		price,
		image,
		variants,
		addOns,
		description,
		category, // New category ID
		storeId,
	} = req.body;

	try {
		// Fetch the product to ensure it exists
		const product = await Product.findById(id);
		if (!product) {
			return res
				.status(404)
				.json({ message: 'Product not found' });
		}

		// Validate that the new category belongs to the same store
		if (category) {
			const existingCategory = await Category.findOne({
				_id: category,
				storeId,
			});
			if (!existingCategory) {
				return res.status(400).json({
					message: 'Invalid category ID for this store',
				});
			}
		}

		// Update the product
		const updatedProduct = await Product.findByIdAndUpdate(
			id,
			{
				name,
				price,
				image,
				variants,
				addOns,
				description,
				category,
			},
			{ new: true }, // Return the updated product
		);

		res.status(200).json(updatedProduct);
	} catch (error) {
		res.status(500).json({
			message: 'Failed to update product',
			error,
		});
	}
};


// Delete a product
export const deleteProduct = async (req, res) => {
	const { id } = req.params;
	try {
		const deletedProduct = await Product.findByIdAndDelete(
			id,
		);
		if (!deletedProduct) {
			return res
				.status(404)
				.json({ message: 'Product not found' });
		}
		res
			.status(200)
			.json({ message: 'Product deleted successfully' });
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Failed to delete product', error });
	}
};

// ---- New functions to handle variants and add-ons ----

// Update a variant
export const updateVariant = async (req, res) => {
	const { productId, variantId } = req.params;
	const { name, price } = req.body;

	try {
		const product = await Product.findById(productId);
		if (!product) {
			return res
				.status(404)
				.json({ message: 'Product not found' });
		}

		const variant = product.variants.id(variantId);
		if (!variant) {
			return res
				.status(404)
				.json({ message: 'Variant not found' });
		}

		variant.name = name;
		variant.price = price;

		await product.save();
		res.status(200).json(product);
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Failed to update variant', error });
	}
};

// Delete a variant
export const deleteVariant = async (req, res) => {
	const { productId, variantId } = req.params;

	try {
		const product = await Product.findById(productId);
		if (!product) {
			return res
				.status(404)
				.json({ message: 'Product not found' });
		}

		product.variants.id(variantId).remove();
		await product.save();
		res
			.status(200)
			.json({ message: 'Variant deleted successfully' });
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Failed to delete variant', error });
	}
};

// Update an add-on
export const updateAddon = async (req, res) => {
	const { productId, addonId } = req.params;
	const { name, price, compulsory } = req.body;

	try {
		const product = await Product.findById(productId);
		if (!product) {
			return res
				.status(404)
				.json({ message: 'Product not found' });
		}

		const addOn = product.addOns.id(addonId);
		if (!addOn) {
			return res
				.status(404)
				.json({ message: 'Add-on not found' });
		}

		addOn.name = name;
		addOn.price = price;
		addOn.compulsory = compulsory;

		await product.save();
		res.status(200).json(product);
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Failed to update add-on', error });
	}
};

// Delete an add-on
export const deleteAddon = async (req, res) => {
	const { productId, addonId } = req.params;

	try {
		const product = await Product.findById(productId);
		if (!product) {
			return res
				.status(404)
				.json({ message: 'Product not found' });
		}

		product.addOns.id(addonId).remove();
		await product.save();
		res
			.status(200)
			.json({ message: 'Add-on deleted successfully' });
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Failed to delete add-on', error });
	}
};
