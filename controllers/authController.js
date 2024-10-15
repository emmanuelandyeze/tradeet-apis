
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import BusinessModel from '../models/BusinessModel.js';

// Step 1: Send verification code via WhatsApp
export const sendVerificationCode = async (req, res) => {
	const { phone } = req.body;

	try {
		// Check if the phone number already exists
		let business = await BusinessModel.findOne({ phone });
		if (business) {
			return res
				.status(400)
				.json({
					message: 'Phone number already registered',
				});
		}

		// Generate verification code (e.g., 4 digits)
		const verificationCode = Math.floor(
			1000 + Math.random() * 9000,
		);

		// Create business with just phone and verificationCode
		business = new BusinessModel({ phone, verificationCode });
		await business.save();

		// Send the verification code using WhatsApp Business API
		// Call your WhatsApp API here with phone and verificationCode

		res
			.status(200)
			.json({
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
    } = req.body;
    
    // console.log(
	// 		phone,
	// 		name,
	// 		logoUrl,
	// 		address,
	// 		password,
	// 		campus,
	// 		isVendor,
	// 	);

	try {
        const business = await BusinessModel.findOne({ phone });
        console.log(business)
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
		await business.save();

		// Generate a JWT token
		const token = jwt.sign(
			{ id: business._id },
			process.env.JWT_SECRET,
			{ expiresIn: '1h' },
		);

		res
			.status(200)
			.json({ token, message: 'Profile setup completed', business });
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
			{ expiresIn: '1h' },
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
