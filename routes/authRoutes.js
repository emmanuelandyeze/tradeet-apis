import express from 'express';
import {
	sendVerificationCode,
	verifyCode,
	completeProfile,
	login,
	getBusinessInfo,
} from '../controllers/authController.js';
import { authenticateBusiness } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Send verification code to phone
router.post('/send-code', sendVerificationCode);

// Verify phone with code
router.post('/verify-code', verifyCode);

// Complete profile setup
router.post('/complete-profile', completeProfile);

// Login
router.post('/login', login);

router.get('/user-info', authenticateBusiness, getBusinessInfo);

export default router;
