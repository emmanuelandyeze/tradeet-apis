import express from 'express';
import {
	createExpense,
	getExpenses,
	deleteExpense,
	updateExpense,
} from '../controllers/expenseController.js';

const router = express.Router();

// Create an Expense
router.post('/create', createExpense);

// Get All Expenses for a Business
router.get('/:businessId', getExpenses);

// Delete an Expense
router.delete('/:id', deleteExpense);

// Update an Expense
router.put('/:id', updateExpense);

export default router;
