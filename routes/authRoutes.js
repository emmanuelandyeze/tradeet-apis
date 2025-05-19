import express from 'express';
import {
	sendVerificationCode,
	verifyCode,
	completeProfile,
	login,
	getBusinessInfo,
	completeCampusProfile,
	forgotPassword,
	resetPassword,
	verifyOtp,
} from '../controllers/authController.js';
import { authenticateBusiness } from '../middlewares/authMiddleware.js';
import dotenv from 'dotenv';
import axios from 'axios';
import qs from 'querystring';
import BusinessModel from '../models/BusinessModel.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const router = express.Router();

const {
	LINKEDIN_CLIENT_ID,
	LINKEDIN_CLIENT_SECRET,
	LINKEDIN_REDIRECT_URI,
} = process.env;

// Step 1: Redirect to LinkedIn auth
router.get('/linkedin', (req, res) => {
	const token = req.query.token;

	if (!token) {
		return res.status(400).send('Token required');
	}

	const state = Buffer.from(JSON.stringify({ token })).toString('base64'); // encode token into state param

	const authUrl =
		`https://www.linkedin.com/oauth/v2/authorization?` +
		qs.stringify({
			response_type: 'code',
			client_id: LINKEDIN_CLIENT_ID,
			redirect_uri: LINKEDIN_REDIRECT_URI,
			scope: 'profile openid w_member_social email',
			state,
		});

	res.redirect(authUrl);
});


router.get('/linkedin/callback', async (req, res) => {
	const { code, state } = req.query;

	if (!code || !state) {
		return res.redirect(
			'myapp://socials?error=missing_code',
		);
	}

	try {
		// Decode the token from the state param
		const { token } = JSON.parse(
			Buffer.from(state, 'base64').toString('utf-8'),
		);

		// Verify token and get user
		const decoded = jwt.verify(
			token,
			process.env.JWT_SECRET,
		); // update secret
		const businessId = decoded.id; // depends on how your token is structured

		if (!businessId) {
			return res.redirect('myapp://socials?error=no_user');
		}

		// Exchange code for access token
		const tokenResponse = await axios.post(
			'https://www.linkedin.com/oauth/v2/accessToken',
			qs.stringify({
				grant_type: 'authorization_code',
				code,
				redirect_uri: LINKEDIN_REDIRECT_URI,
				client_id: LINKEDIN_CLIENT_ID,
				client_secret: LINKEDIN_CLIENT_SECRET,
			}),
			{
				headers: {
					'Content-Type':
						'application/x-www-form-urlencoded',
				},
			},
		);

		const accessToken = tokenResponse.data.access_token;

		// Fetch LinkedIn profile
		const profileResponse = await axios.get(
			'https://api.linkedin.com/v2/userinfo',
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		console.log(profileResponse.data)

		const linkedinData = {
			id: profileResponse.data.id,
			name: `${profileResponse.data.name}`,
			accessToken, // encrypt in production
		};

		console.log(linkedinData)

		// Save to DB
		await BusinessModel.findByIdAndUpdate(businessId, {
			'socialAccounts.linkedin': linkedinData,
		});

		return res.redirect('myapp://socials?success=true');
	} catch (error) {
		console.error('LinkedIn OAuth Error:', error.message);
		return res.redirect(
			'myapp://socials?error=auth_failed',
		);
	}
});

// Write a function to get the business' social accounts



// Send verification code to phone
router.post('/send-code', sendVerificationCode);

// Verify phone with code
router.post('/verify-code', verifyCode);

// Complete profile setup
router.post('/complete-profile', completeProfile);
router.post(
	'/complete-campus-profile',
	completeCampusProfile,
);

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// Login
router.post('/login', login);

router.get('/user-info', authenticateBusiness, getBusinessInfo);

export default router;
