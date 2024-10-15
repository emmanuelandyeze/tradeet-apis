// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import BusinessModel from '../models/BusinessModel.js';

export const authenticateBusiness = async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Assumes 'Bearer token' format
    // console.log(token)

	if (!token) {
		return res
			.status(401)
			.json({ message: 'No token, authorization denied' });
	}

	try {
		const decoded = jwt.verify(
			token,
			process.env.JWT_SECRET,
        ); // Replace with your secret
        console.log(decoded) // Log decoded token for debugging purposes    
		req.user = await BusinessModel.findById(decoded.id).select(
			'-password -__v',
		); // Get user info
		next();
	} catch (error) {
		console.error('Token verification error:', error);
		return res
			.status(401)
			.json({ message: 'Token is not valid' });
	}
};
