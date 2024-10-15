import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());

app.use(cors());

// Routes
app.get('/', (req, res) => {
	res.send('Welcome to Tradeet Mobile API');
});
app.use('/api/auth', authRoutes);

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log('MongoDB connected...');
	} catch (err) {
		console.error(err.message);
		process.exit(1);
	}
};

connectDB();

// Start server
app.listen(port, () =>
	console.log(`Server running on port ${port}`),
);

export default app;
