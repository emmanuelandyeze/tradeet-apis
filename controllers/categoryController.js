import { Category } from '../models/Category.js';

// Get all categories for a specific store
export const getCategoriesByStore = async (req, res) => {
	const { storeId } = req.params;
	try {
		const categories = await Category.find({ storeId });
		res.status(200).json(categories);
	} catch (error) {
		res.status(500).json({
			message: 'Failed to fetch categories',
			error,
		});
	}
};

// Get a single category by ID
export const getCategoryById = async (req, res) => {
	const { id } = req.params;
	try {
		const category = await Category.findById(id);
		if (!category) {
			return res
				.status(404)
				.json({ message: 'Category not found' });
		}
		res.status(200).json(category);
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Failed to fetch category', error });
	}
};

// Create a new category for a store
export const createCategory = async (req, res) => {
	const { storeId } = req.params;
	const { name, description } = req.body;

	try {
		const newCategory = new Category({
			name,
			description,
			storeId, // Associate category with the store
		});
		await newCategory.save();
		res.status(201).json(newCategory);
	} catch (error) {
		res.status(500).json({
			message: 'Failed to create category',
			error,
		});
	}
};

// Update a category
export const updateCategory = async (req, res) => {
	const { id } = req.params;
	const { name, description } = req.body;

	try {
		const updatedCategory =
			await Category.findByIdAndUpdate(
				id,
				{ name, description },
				{ new: true },
			);
		if (!updatedCategory) {
			return res
				.status(404)
				.json({ message: 'Category not found' });
		}
		res.status(200).json(updatedCategory);
	} catch (error) {
		res.status(500).json({
			message: 'Failed to update category',
			error,
		});
	}
};

// Delete a category
export const deleteCategory = async (req, res) => {
	const { id } = req.params;

	try {
		const deletedCategory =
			await Category.findByIdAndDelete(id);
		if (!deletedCategory) {
			return res
				.status(404)
				.json({ message: 'Category not found' });
		}
		res
			.status(200)
			.json({ message: 'Category deleted successfully' });
	} catch (error) {
		res.status(500).json({
			message: 'Failed to delete category',
			error,
		});
	}
};
