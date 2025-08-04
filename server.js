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
import runnerRoutes from './routes/runnerRoutes.js';
import deliveryRequestRoutes from './routes/deliveryRequestRoutes.js';
import discountRoutes from './routes/discountRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import { Server } from 'socket.io';
import googleRoutes from './routes/googlePlacesRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import { decryptRequest } from '../api/encryption.js';
import { getNextScreen } from '../api/flow.js';
import crypto from 'crypto';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

// Log when the server starts
console.log(
	`[SERVER STARTUP] Attempting to start server on port ${port}...`,
);

app.use(
	express.json({
		// store the raw request body to use it for signature verification
		verify: (req, res, buf, encoding) => {
			req.rawBody = buf?.toString(encoding || 'utf8');
		},
	}),
);

const {
	// APP_SECRET,
	PRIVATE_KEY,
	PASSPHRASE = '',
} = process.env;

const APP_SECRET = null;

// Middleware
app.use(express.json()); // This is now the primary JSON body parser
app.use(cors());

// Add a general request logger middleware
app.use((req, res, next) => {
	console.log(
		`[REQUEST] ${new Date().toISOString()} - ${
			req.method
		} ${req.originalUrl}`,
	);
	// Log request body for POST/PUT/PATCH requests (be cautious with sensitive data)
	if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
		console.log('[REQUEST BODY]', req.body);
	}
	next();
});

app.use(
	express.json({
		// store the raw request body to use it for signature verification
		verify: (req, res, buf, encoding) => {
			req.rawBody = buf?.toString(encoding || 'utf8');
		},
	}),
);

function isRequestSignatureValid(req) {
	if (!APP_SECRET) {
		console.warn(
			'App Secret is not set up. Please Add your app secret in /.env file to check for request validation',
		);
		return true;
	}

	const signatureHeader = req.get('x-hub-signature-256');
	const signatureBuffer = Buffer.from(
		signatureHeader.replace('sha256=', ''),
		'utf-8',
	);

	const hmac = crypto.createHmac('sha256', APP_SECRET);
	const digestString = hmac
		.update(req.rawBody)
		.digest('hex');
	const digestBuffer = Buffer.from(digestString, 'utf-8');

	if (
		!crypto.timingSafeEqual(digestBuffer, signatureBuffer)
	) {
		console.error('Error: Request Signature did not match');
		return false;
	}
	return true;
}

// Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/student-auth', studentAuthRoutes);
app.use('/runner-auth', runnerAuthRoutes);
app.use('/businesses', businessRoutes);
app.use('/orders', orderRoutes);
app.use('/runner', runnerRoutes);
app.use('/delivery', deliveryRequestRoutes);
app.use('/discounts', discountRoutes);
app.use('/category', categoryRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/expenses', expenseRoutes);
app.use('/google', googleRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/customers', customerRoutes);
app.use('/groups', groupRoutes);

// Add a response logger middleware
app.use((req, res, next) => {
	const originalSend = res.send;
	res.send = function (body) {
		console.log(
			`[RESPONSE] ${new Date().toISOString()} - ${
				req.method
			} ${req.originalUrl} - Status: ${res.statusCode}`,
		);
		originalSend.apply(res, arguments);
	};
	next();
});

const io = new Server(server, {
	cors: {
		origin: '*', // Allow all origins or specify your client URL
	},
});

// --- Database Reconnection Logic ---
const MONGO_URI = process.env.MONGO_URI;
const RECONNECT_INTERVAL = 5000; // 5 seconds
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10; // Max attempts before giving up

const connectDB = async () => {
	try {
		console.log(
			`[DB CONNECTION] Attempting to connect to MongoDB... (Attempt: ${
				reconnectAttempts + 1
			})`,
		);
		await mongoose.connect(MONGO_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
			socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
		});
		console.log(
			'[DB CONNECTION] MongoDB connected successfully!',
		);
		reconnectAttempts = 0; // Reset attempts on successful connection
	} catch (err) {
		console.error(`[DB CONNECTION ERROR] ${err.message}`);
		reconnectAttempts++;
		if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
			console.warn(
				`[DB CONNECTION] Retrying connection in ${
					RECONNECT_INTERVAL / 1000
				} seconds... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
			);
			setTimeout(connectDB, RECONNECT_INTERVAL);
		} else {
			console.error(
				'[DB CONNECTION] Max reconnection attempts reached. Exiting process.',
			);
			process.exit(1);
		}
	}
};

// Listen for Mongoose connection events
mongoose.connection.on('disconnected', () => {
	console.error(
		'[DB DISCONNECTED] MongoDB connection lost. Attempting to reconnect...',
	);
	reconnectAttempts = 0; // Reset attempts to allow retries from scratch
	setTimeout(connectDB, RECONNECT_INTERVAL);
});

mongoose.connection.on('error', (err) => {
	console.error(
		`[DB ERROR] MongoDB experienced an error: ${err.message}`,
	);
	// The 'disconnected' event usually follows an 'error' event that leads to disconnection.
	// If not, you might want to call connectDB here, but be careful of double-triggering.
});

// Initial connection attempt
connectDB();
// --- End Database Reconnection Logic ---

// Dictionary to store runner sockets by runnerId
const runnerSockets = {};

// Setup the connection handler for Socket.IO
io.on('connection', (socket) => {
	const { runnerId } = socket.handshake.query;
	console.log(
		`[SOCKET.IO] New connection from client with ID: ${socket.id}`,
	);

	if (runnerId) {
		runnerSockets[runnerId] = socket.id;
		console.log(
			`[SOCKET.IO] Runner ${runnerId} connected with socket ID ${
				socket.id
			}. Total connected runners: ${
				Object.keys(runnerSockets).length
			}`,
		);
	} else {
		console.log(
			`[SOCKET.IO] Client connected without a runnerId in query: ${socket.id}`,
		);
	}

	// Log when a client emits an event
	socket.onAny((eventName, ...args) => {
		console.log(
			`[SOCKET.IO EVENT RECEIVED] Socket ID: ${socket.id}, Event: ${eventName}, Data:`,
			args,
		);
	});

	// Cleanup on disconnect
	socket.on('disconnect', (reason) => {
		if (runnerId) {
			delete runnerSockets[runnerId];
			console.log(
				`[SOCKET.IO] Runner ${runnerId} disconnected (Socket ID: ${
					socket.id
				}). Reason: ${reason}. Remaining connected runners: ${
					Object.keys(runnerSockets).length
				}`,
			);
		} else {
			console.log(
				`[SOCKET.IO] Client disconnected (Socket ID: ${socket.id}). Reason: ${reason}`,
			);
		}
	});

	// Example of how to log specific socket events (you can add more as needed)
	socket.on('deliveryRequestUpdate', (data) => {
		console.log(
			`[SOCKET.IO EVENT] Received deliveryRequestUpdate:`,
			data,
		);
	});

	socket.on('locationUpdate', (data) => {
		console.log(
			`[SOCKET.IO EVENT] Received locationUpdate from runner ${runnerId}:`,
			data,
		);
	});
});

// Export server and helper functions
export const getRunnerSocketId = (runnerId) => {
	console.log(
		`[HELPER FUNCTION] getRunnerSocketId called for runner: ${runnerId}`,
	);
	return runnerSockets[runnerId];
};
export const getAllRunnerSockets = () => {
	console.log(
		`[HELPER FUNCTION] getAllRunnerSockets called. Current runner sockets:`,
		runnerSockets,
	);
	return { ...runnerSockets };
};

export { io }; // Export io for use in other files

// Start server
server.listen(port, () => {
	console.log(
		`[SERVER STATUS] Server successfully running on port ${port}`,
	);
});

export default app;
