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
import {
	decryptRequest,
	encryptResponse,
	FlowEndpointException,
} from './encryption.js';
import { getNextScreen } from './flow.js';
import crypto from 'crypto';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

app.use(
	express.json({
		// store the raw request body to use it for signature verification
		verify: (req, res, buf, encoding) => {
			req.rawBody = buf?.toString(encoding || 'utf8');
		},
	}),
);

const { APP_SECRET, PRIVATE_KEY } = process.env;

// Middleware
app.use(express.json());

app.use(cors());

app.use(
	express.json({
		verify: (req, res, buf) => {
			req.rawBody = buf;
		},
	}),
);

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

app.post('/', async (req, res) => {
	if (!PRIVATE_KEY) {
		throw new Error(
			'Private key is empty. Please check your env variable "PRIVATE_KEY".',
		);
	}

	if (!isRequestSignatureValid(req)) {
		// Return status code 432 if request signature does not match.
		// To learn more about return error codes visit: https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes
		return res.status(432).send();
	}

	let decryptedRequest = null;
	try {
		decryptedRequest = decryptRequest(
			req.body,
			PRIVATE_KEY,
			PASSPHRASE,
		);
	} catch (err) {
		console.error(err);
		if (err instanceof FlowEndpointException) {
			return res.status(err.statusCode).send();
		}
		return res.status(500).send();
	}

	const {
		aesKeyBuffer,
		initialVectorBuffer,
		decryptedBody,
	} = decryptedRequest;
	console.log('💬 Decrypted Request:', decryptedBody);

	// TODO: Uncomment this block and add your flow token validation logic.
	// If the flow token becomes invalid, return HTTP code 427 to disable the flow and show the message in `error_msg` to the user
	// Refer to the docs for details https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes

	/*
  if (!isValidFlowToken(decryptedBody.flow_token)) {
    const error_response = {
      error_msg: `The message is no longer available`,
    };
    return res
      .status(427)
      .send(
        encryptResponse(error_response, aesKeyBuffer, initialVectorBuffer)
      );
  }
  */

	const screenResponse = await getNextScreen(decryptedBody);
	console.log('👉 Response to Encrypt:', screenResponse);

	res.send(
		encryptResponse(
			screenResponse,
			aesKeyBuffer,
			initialVectorBuffer,
		),
	);
});

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

// Dictionary to store runner sockets by runnerId
const runnerSockets = {};

// Setup the connection handler
io.on('connection', (socket) => {
	const { runnerId } = socket.handshake.query;

	if (runnerId) {
		runnerSockets[runnerId] = socket.id;
		console.log(
			`Runner ${runnerId} connected with socket ID ${socket.id}`,
		);
	}

	// Cleanup on disconnect
	socket.on('disconnect', () => {
		if (runnerId) {
			delete runnerSockets[runnerId];
			console.log(`Runner ${runnerId} disconnected`);
		}
	});
});

// Export server and helper functions
export const getRunnerSocketId = (runnerId) =>
	runnerSockets[runnerId];
export const getAllRunnerSockets = () => ({
	...runnerSockets,
});

export { io }; // Export io for use in other files

// Start server
server.listen(port, () =>
	console.log(`Server running on port ${port}`),
);

function isRequestSignatureValid(req) {
	if (!APP_SECRET) {
		console.warn(
			'App Secret is not set up. Please Add your app secret in /.env file to check for request validation',
		);
		return true;
	}

	const signatureHeader = req.get('x-hub-signature-256');
	if (!signatureHeader) {
		console.error(
			'Error: x-hub-signature-256 header is missing',
		);
		return false;
	}
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

export default app;
