
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import BusinessModel from '../models/BusinessModel.js';
import axios from 'axios';

const sendCode = async (whatsapp, verificationCode) => {
	try {
		const sendMessage = async () => {
			const accessToken = process.env.FB_SECRET;
			const url =
				'https://graph.facebook.com/v20.0/382339108296299/messages';

			try {
				const response = await axios.post(
					url,
					{
						messaging_product: 'whatsapp',
						to: whatsapp, // Ensure the correct phone number
						type: 'template',
						template: {
							name: 'code',
							language: {
								code: 'en',
							},
							components: [
								{
									type: 'body',
									parameters: [
										{
											type: 'text',
											text: verificationCode,
										},
									],
								},
							],
						},
					},
					{
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
						},
					},
				);

				console.log('Response:', response.data);
				// Further logging
				console.log(
					'Message ID:',
					response.data.messages[0].id,
				);
				console.log(
					'Recipient WA ID:',
					response.data.contacts[0].wa_id,
				);
			} catch (error) {
				console.error(
					'Error sending message:',
					error.response
						? error.response.data
						: error.message,
				);
			}
		};

		sendMessage();

		return verificationCode;
	} catch (error) {
		console.error(
			'Error sending verification code:',
			error,
		);
		throw new Error('Failed to send verification code.');
	}
};

// Step 1: Send verification code via WhatsApp
export const sendVerificationCode = async (req, res) => {
	const { phone } = req.body;

	try {
		// Check if the phone number already exists
		let business = await BusinessModel.findOne({ phone });
		if (business) {
			return res.status(400).json({
				message: 'Phone number already registered',
			});
		}

		// Generate verification code (e.g., 4 digits)
		// const verificationCode = Math.floor(
		// 	1000 + Math.random() * 9000,
		// );

		const verificationCode = 1234;

		// Create business with just phone and verificationCode
		business = new BusinessModel({
			phone,
			verificationCode,
		});
		await business.save();

		// Send the verification code using WhatsApp Business API
		await sendCode(phone, verificationCode);

		res.status(200).json({
			message: 'Verification code sent via WhatsApp',
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};

// Step 2: Verify code
export const verifyCode = async (req, res) => {
	const { phone, code } = req.body;

	try {
		const business = await BusinessModel.findOne({ phone });
		if (!business || business.verificationCode !== code) {
			return res
				.status(400)
				.json({ message: 'Invalid code or phone number' });
		}

		// Mark the business as verified
		business.isVerified = true;
		business.verificationCode = undefined; // clear the code
		await business.save();

		res
			.status(200)
			.json({ message: 'Phone number verified' });
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};

// Step 3: Complete Profile Setup
export const completeProfile = async (req, res) => {
	const {
		phone,
		name,
		logoUrl,
		address,
		password,
		campus,
		isVendor,
		serviceType,
	} = req.body;

	try {
		const business = await BusinessModel.findOne({ phone });
		console.log(business);
		if (!business || !business.isVerified) {
			return res
				.status(400)
				.json({ message: 'Phone number not verified' });
		}

		// Hash the password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(
			password,
			salt,
		);

		// Update business details
		business.name = name;
		business.logoUrl = logoUrl;
		business.address = address;
		business.password = hashedPassword;
		business.isVendor = isVendor;
		if (isVendor) {
			business.campus = campus;
		}
		business.serviceType = serviceType;
		await business.save();

		// Generate a JWT token
		const token = jwt.sign(
			{ id: business._id },
			process.env.JWT_SECRET,
			{ expiresIn: '30d' },
		);

		res.status(200).json({
			token,
			message: 'Profile setup completed',
			business,
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};

export const completeCampusProfile = async (req, res) => {
	const {
		phone,

		campus,
	} = req.body;

	try {
		const business = await BusinessModel.findOne({ phone });
		console.log(business);
		if (!business || !business.isVerified) {
			return res
				.status(400)
				.json({ message: 'Phone number not verified' });
		}

		// Update business details
		business.campus = campus;

		await business.save();

		// Generate a JWT token
		const token = jwt.sign(
			{ id: business._id },
			process.env.JWT_SECRET,
			{ expiresIn: '30d' },
		);

		res.status(200).json({
			token,
			message: 'Profile setup completed',
			business,
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};

// Step 4: Login
export const login = async (req, res) => {
	const { phone, password } = req.body;

	try {
		const business = await BusinessModel.findOne({ phone });
		if (!business) {
			return res
				.status(400)
				.json({ message: 'Business not found' });
		}

		// Check password
		const isMatch = await bcrypt.compare(
			password,
			business.password,
		);
		if (!isMatch) {
			return res
				.status(400)
				.json({ message: 'Invalid credentials' });
		}

		// Generate token
		const token = jwt.sign(
			{ id: business._id },
			process.env.JWT_SECRET,
			{ expiresIn: '30d' },
		);

		res.status(200).json({ token });
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};

// Step 5: Get business information

export const getBusinessInfo = async (req, res) => {
    const id = req.user.id;

    try {
        const business = await BusinessModel.findById(
					id,
				).select('-password -__v');
        if (!business) {
            return res
                .status(404)
                .json({ message: 'Business not found' });
        }

        res.status(200).json({ business });
    } catch (error) {
        res
            .status(500)
            .json({ message: 'Server error', error });
    }
};
