import express from 'express';
import {
	createGroup,
	getGroups,
	getGroupById,
	updateGroup,
	deleteGroup,
	addCustomerToGroup,
	removeCustomerFromGroup,
} from '../controllers/groupController.js';

const router = express.Router();

router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

router.post('/:groupId/add-customer', addCustomerToGroup);
router.post(
	'/:groupId/remove-customer',
	removeCustomerFromGroup,
);

export default router;
