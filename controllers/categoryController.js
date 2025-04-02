import { Category } from '../models/Category.js';

// Utility function to create a slug from a string
const createSlug = (name) => {
	return name
		.toLowerCase()
		.replace(/[^\w\s-]/g, '') // Remove non-word characters
		.replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
		.replace(/^-+|-+$/g, ''); // Trim hyphens from start and end
};

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
		// Generate base slug from name
		let slug = createSlug(name);
		let counter = 1;
		let isUnique = false;

		// Check for uniqueness and append number if needed
		while (!isUnique) {
			const existingCategory = await Category.findOne({
				storeId,
				slug,
			});
			if (!existingCategory) {
				isUnique = true;
			} else {
				slug = `${createSlug(name)}-${counter}`;
				counter++;
			}
		}

		const newCategory = new Category({
			name,
			description,
			storeId,
			slug, // Add the generated unique slug
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
		// If name is being updated, we should update the slug too
		let updateData = { name, description };

		if (name) {
			const category = await Category.findById(id);
			if (category.name !== name) {
				// Generate new slug if name changed
				let slug = createSlug(name);
				let counter = 1;
				let isUnique = false;

				while (!isUnique) {
					const existingCategory = await Category.findOne({
						storeId: category.storeId,
						slug,
						_id: { $ne: id }, // Exclude current category
					});
					if (!existingCategory) {
						isUnique = true;
					} else {
						slug = `${createSlug(name)}-${counter}`;
						counter++;
					}
				}
				updateData.slug = slug;
			}
		}

		const updatedCategory =
			await Category.findByIdAndUpdate(id, updateData, {
				new: true,
			});
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
