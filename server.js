import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import indexRoutes from './routes/index.js';
import productRoutes from './routes/productRoutes.js';
import studentAuthRoutes from './routes/studentAuthRoutes.js';
import businessRoutes from './routes/businessRoute.js';
import orderRoutes from './routes/orderRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());

app.use(cors());

// Routes
app.use('/', indexRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/student-auth', studentAuthRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/orders', orderRoutes);

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
