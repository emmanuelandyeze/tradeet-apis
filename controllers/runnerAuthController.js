import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import Runner from '../models/Runner.js';

// Function to send WhatsApp verification code using WhatsApp Business API
const sendCode = async (phone, verificationCode) => {
	const accessToken = process.env.FB_SECRET;
	const url =
		'https://graph.facebook.com/v20.0/382339108296299/messages';

	try {
		const response = await axios.post(
			url,
			{
				messaging_product: 'whatsapp',
				to: phone,
				type: 'template',
				template: {
					name: 'code',
					language: { code: 'en' },
					components: [
						{
							type: 'body',
							parameters: [
								{ type: 'text', text: verificationCode },
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
		console.log('Verification code sent:', response.data);
	} catch (error) {
		console.error(
			'Error sending message:',
			error.response ? error.response.data : error.message,
		);
	}
};

// Step 1: Send verification code
export const sendVerificationCode = async (req, res) => {
	const { phone } = req.body;

	try {
		console.log(phone);
		let runner = await Runner.findOne({ phone });
		if (runner) {
			return res.status(400).json({
				message: 'Phone number already registered',
			});
		}

		// const verificationCode = Math.floor(
		// 	1000 + Math.random() * 9000,
		// ); // 4-digit code

		const verificationCode = 1234;

		runner = new Runner({ phone, verificationCode });
		console.log(runner);
		await runner.save();

		// await sendCode(phone, verificationCode);
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
		const runner = await Runner.findOne({ phone });
		if (!runner || runner.verificationCode !== code) {
			return res
				.status(400)
				.json({ message: 'Invalid code or phone number' });
		}

		runner.isVerified = true;
		runner.verificationCode = undefined; // Clear the code
		await runner.save();

		res
			.status(200)
			.json({ message: 'Phone number verified' });
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};

// Step 3: Complete profile setup
export const completeProfile = async (req, res) => {
	const { phone, name, nin, profileImage, password } =
		req.body; // Include all relevant fields

	try {
		console.log(phone, name, nin, profileImage, password); // Log all inputs for debugging

		const runner = await Runner.findOne({ phone });
		if (!runner) {
			return res
				.status(400)
				.json({ message: 'Runner not found' });
		}
		if (!runner.isVerified) {
			return res
				.status(400)
				.json({ message: 'Phone number not verified' });
		}

		// Conditionally update runner's profile details
		if (name) runner.name = name;
		if (nin) runner.nin = nin;
		if (profileImage) runner.profileImage = profileImage; // Handle file upload appropriately

		// Conditionally hash and save the password if provided
		if (password) {
			const salt = await bcrypt.genSalt(10);
			runner.password = await bcrypt.hash(password, salt); // Hash and save the password
		}

		await runner.save(); // Save updated runner data

		// Create a token for the runner
		const token = jwt.sign(
			{ id: runner._id },
			process.env.JWT_SECRET,
			{ expiresIn: '30d' },
		);

		console.log(runner);

		res.status(200).json({
			token,
			message: 'Profile setup completed',
			runner,
		});
	} catch (error) {
		console.error(error); // Log the error for debugging
		res.status(500).json({
			message: 'Server error',
			error: error.message,
		});
	}
};

export const completeCampusProfile = async (req, res) => {
	const { phone, campus } = req.body;

	try {
		const runner = await Runner.findOne({ phone });
		console.log(runner);
		if (!runner || !runner.isVerified) {
			return res
				.status(400)
				.json({ message: 'Phone number not verified' });
		}

		// Update business details
		runner.campus = campus;

		await runner.save();

		// Generate a JWT token
		const token = jwt.sign(
			{ id: runner._id },
			process.env.JWT_SECRET,
			{ expiresIn: '30d' },
		);

		res.status(200).json({
			token,
			message: 'Profile setup completed',
			runner,
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
	console.log(phone, password);

	try {
		const runner = await Runner.findOne({ phone });
		console.log(runner);
		if (!runner) {
			return res
				.status(400)
				.json({ message: 'Runner not found' });
		}

		const isMatch = bcrypt.compare(
			password,
			runner.password,
		);
		if (!isMatch) {
			return res
				.status(400)
				.json({ message: 'Invalid credentials' });
		}

		const token = jwt.sign(
			{ id: runner._id },
			process.env.JWT_SECRET,
			{ expiresIn: '30d' },
		);

		console.log(token);

		res.status(200).json({ token });
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};

// Step 5: Get student info
export const getRunnerInfo = async (req, res) => {
	const id = req?.user?._id;

	try {
		const runner = await Runner.findById(id).select(
			'-password -__v',
		);
		if (!runner) {
			return res
				.status(404)
				.json({ message: 'Runner not found' });
		}

		res.status(200).json({ runner });
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};
