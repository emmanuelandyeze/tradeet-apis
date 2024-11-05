import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import authRoutes from './routes/authRoutes.js';
import indexRoutes from './routes/index.js';
import productRoutes from './routes/productRoutes.js';
import studentAuthRoutes from './routes/studentAuthRoutes.js';
import businessRoutes from './routes/businessRoute.js';
import orderRoutes from './routes/orderRoutes.js';
import runnerAuthRoutes from './routes/runnerAuthRoutes.js';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());

app.use(cors());

// Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/student-auth', studentAuthRoutes);
app.use('/runner-auth', runnerAuthRoutes);
app.use('/businesses', businessRoutes);
app.use('/orders', orderRoutes);

const io = new Server(server, {
	cors: {
		origin: '*', // Allow all origins or specify your client URL
	},
});

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

// WebSocket connection
io.on('connection', (socket) => {
	console.log('A user connected', socket.id);

	socket.on('disconnect', () => {
		console.log('A user disconnected', socket.id);
	});
});

export { io }; // Export io for use in other files

// Start server
server.listen(port, () =>
	console.log(`Server running on port ${port}`),
);

export default app;
