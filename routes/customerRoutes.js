// routes/customers.js
import express from 'express';
import {
	getCustomers,
	getCustomerById,
	createCustomer,
	updateCustomer,
	deleteCustomer,
	broadcastToCustomers,
	updateGroup,
	deleteGroup,
	addCustomersToGroup,
} from '../controllers/customersController.js';

const router = express.Router();

router.get('/', getCustomers);
router.get('/customer/:id', getCustomerById);
router.post('/customer', createCustomer);
router.put('/customer/:id', updateCustomer);
router.delete('/customer/:id', deleteCustomer);
router.post('/broadcast', broadcastToCustomers);
router.post('/group/update', updateGroup);
router.post('/group/delete', deleteGroup);
router.post('/group/add', addCustomersToGroup);

export default router; 
