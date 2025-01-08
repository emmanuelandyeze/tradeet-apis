import Expense from '../models/Expense.js';

// Create an Expense
export const createExpense = async (req, res) => {
	const {
		businessId,
		title,
		category,
		amount,
		description,
	} = req.body;

	try {
		const expense = new Expense({
			businessId,
			title,
			category,
			amount,
			description,
		});

		await expense.save();
		res.status(201).json({
			message: 'Expense created successfully',
			expense,
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Error creating expense', error });
	}
};

// Get All Expenses for a Business
export const getExpenses = async (req, res) => {
	const { businessId } = req.params;

	try {
		const expenses = await Expense.find({ businessId });
		res.status(200).json({
			message: 'Expenses fetched successfully',
			expenses,
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Error fetching expenses', error });
	}
};

// Delete an Expense
export const deleteExpense = async (req, res) => {
	const { id } = req.params;

	try {
		await Expense.findByIdAndDelete(id);
		res
			.status(200)
			.json({ message: 'Expense deleted successfully' });
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Error deleting expense', error });
	}
};

// Update an Expense
export const updateExpense = async (req, res) => {
	const { id } = req.params;
	const { title, category, amount, description } = req.body;

	try {
		const expense = await Expense.findByIdAndUpdate(
			id,
			{ title, category, amount, description },
			{ new: true },
		);

		res.status(200).json({
			message: 'Expense updated successfully',
			expense,
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Error updating expense', error });
	}
};
