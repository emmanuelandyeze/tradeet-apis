import express from 'express';
import {
	sendVerificationCode,
	verifyCode,
	completeProfile,
	login,
	getRunnerInfo,
	completeCampusProfile,
	updateExpoToken,
} from '../controllers/runnerAuthController.js';
import { protect } from '../middlewares/runnerAuthMiddleware.js';

const router = express.Router();

router.post('/send-code', sendVerificationCode);
router.post('/verify-code', verifyCode);
router.post('/complete-profile', completeProfile);
router.post(
	'/complete-campus-profile',
	completeCampusProfile,
);
router.post('/login', login);
router.get('/me', protect, getRunnerInfo);
router.put('/:runnerId/expo-token', updateExpoToken);

export default router;
