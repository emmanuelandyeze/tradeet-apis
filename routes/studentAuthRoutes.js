import express from 'express';
import {
	sendVerificationCode,
	verifyCode,
	completeProfile,
	login,
	getStudentInfo,
	completeCampusProfile,
	updateExpoToken,
} from '../controllers/studentAuthController.js';
import { protect } from '../middlewares/studentAuthMiddleware.js';

const router = express.Router();

router.post('/send-code', sendVerificationCode);
router.post('/verify-code', verifyCode);
router.post('/complete-profile', completeProfile);
router.post(
	'/complete-campus-profile',
	completeCampusProfile,
);
router.post('/login', login);
router.get('/me', protect, getStudentInfo); 
router.put('/:studentId/expo-token', updateExpoToken);

export default router;
