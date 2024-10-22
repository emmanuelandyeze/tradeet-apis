import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import StudentModel from '../models/StudentModel.js';
import axios from 'axios';

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
		let student = await StudentModel.findOne({ phone });
		if (student) {
			return res.status(400).json({
				message: 'Phone number already registered',
			});
		}

		// const verificationCode = Math.floor(
		// 	1000 + Math.random() * 9000,
		// ); // 4-digit code

		const verificationCode = 1234;

		student = new StudentModel({ phone, verificationCode });
		await student.save();

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
		const student = await StudentModel.findOne({ phone });
		if (!student || student.verificationCode !== code) {
			return res
				.status(400)
				.json({ message: 'Invalid code or phone number' });
		}

		student.isVerified = true;
		student.verificationCode = undefined; // Clear the code
		await student.save();

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
	const { phone, name, password, campus } = req.body;

	try {
		const student = await StudentModel.findOne({ phone });
		if (!student || !student.isVerified) {
			return res
				.status(400)
				.json({ message: 'Phone number not verified' });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(
			password,
			salt,
		);

		student.name = name;
		student.campus = campus;
		student.password = hashedPassword;
		await student.save();

		const token = jwt.sign(
			{ id: student._id },
			process.env.JWT_SECRET,
			{ expiresIn: '30d' },
		);

		res.status(200).json({
			token,
			message: 'Profile setup completed',
			student,
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};

export const completeCampusProfile = async (req, res) => {
	const { phone, campus } = req.body;

	try {
		const student = await StudentModel.findOne({ phone });
		console.log(student);
		if (!student || !student.isVerified) {
			return res
				.status(400)
				.json({ message: 'Phone number not verified' });
		}

		// Update business details
		student.campus = campus;

		await student.save();

		// Generate a JWT token
		const token = jwt.sign(
			{ id: student._id },
			process.env.JWT_SECRET,
			{ expiresIn: '30d' },
		);

		res.status(200).json({
			token,
			message: 'Profile setup completed',
			student,
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
		const student = await StudentModel.findOne({ phone });
		console.log(student);
		if (!student) {
			return res
				.status(400)
				.json({ message: 'Student not found' });
		}

		const isMatch = bcrypt.compare(
			password,
			student.password,
		);
		if (!isMatch) {
			return res
				.status(400)
				.json({ message: 'Invalid credentials' });
		}

		const token = jwt.sign(
			{ id: student._id },
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
export const getStudentInfo = async (req, res) => {
	const id = req.user._id;

	try {
		const student = await StudentModel.findById(id).select(
			'-password -__v',
		);
		if (!student) {
			return res
				.status(404)
				.json({ message: 'Student not found' });
		}

		res.status(200).json({ student });
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Server error', error });
	}
};
