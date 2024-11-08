// controllers/DeliveryRequestController.js
import DeliveryRequest from '../models/DeliveryRequest.js';
import { io } from '../server.js'; // Assuming you're using socket.io
import { getRunnerSocketId } from '../server.js';

// Create a new delivery request
export const createDeliveryRequest = async (req, res) => {
	try {
		const {
			storeName,
			pickupAddress,
			deliveryAddress,
			studentName,
			studentPhone,
			runnerId,
		} = req.body;

		// Create the new delivery request with runner information
		const deliveryRequest = new DeliveryRequest({
			storeName,
			pickupAddress,
			deliveryAddress,
			studentName,
			studentPhone,
			runnerInfo: {
				runnerId,
				accepted: false,
				acceptedAt: null,
			},
		});

		await deliveryRequest.save();

		// Assuming you have a runnerId available in your code
		const runnerSocketId = getRunnerSocketId(runnerId);

		if (runnerSocketId) {
			io.to(runnerSocketId).emit('newDeliveryRequest', {
				message: 'You have a new delivery request!',
				deliveryRequest,
			});
		} else {
			console.log(
				`Runner with ID ${runnerId} is not connected`,
			);
		}

		res.status(201).json({
			success: true,
			message: 'Delivery request created successfully',
			deliveryRequest,
		});
	} catch (error) {
		console.error(
			'Error creating delivery request:',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Error creating delivery request',
		});
	}
};

// Runner accepts a delivery request
export const acceptDeliveryRequest = async (req, res) => {
	try {
		const { requestId, runnerId } = req.body;

		console.log(requestId, runnerId);

		const deliveryRequest = await DeliveryRequest.findById(
			requestId,
		);

		if (!deliveryRequest) {
			return res.status(404).json({
				success: false,
				message: 'Delivery request not found',
			});
		}

		if (deliveryRequest.status !== 'pending') {
			return res.status(400).json({
				success: false,
				message:
					'This request has already been accepted or rejected',
			});
		}

		// Update delivery request with runner's information
		deliveryRequest.runnerInfo = {
			runnerId,
			accepted: true,
			acceptedAt: new Date(),
		};
		deliveryRequest.status = 'accepted'; // Mark it as accepted

		await deliveryRequest.save();

		io.emit('acceptedDeliveryRequest', {
			message: 'Order accepted by runner',
			deliveryRequest,
		});

		// Assuming you have a runnerId available in your code
		const runnerSocketId = getRunnerSocketId(runnerId);

		if (runnerSocketId) {
			io.to(runnerSocketId).emit(
				'acceptedDeliveryRequest',
				{
					message: 'Order accepted by runner!',
					deliveryRequest,
				},
			);
		} else {
			console.log(
				`Runner with ID ${runnerId} is not connected`,
			);
		}

		res.status(200).json({
			success: true,
			message: 'Delivery request accepted successfully',
			deliveryRequest,
		});
	} catch (error) {
		console.error(
			'Error accepting delivery request:',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Error accepting delivery request',
		});
	}
};

// Runner rejects a delivery request
export const rejectDeliveryRequest = async (req, res) => {
	try {
		const { requestId, runnerId } = req.body;

		const deliveryRequest = await DeliveryRequest.findById(
			requestId,
		);

		if (!deliveryRequest) {
			return res.status(404).json({
				success: false,
				message: 'Delivery request not found',
			});
		}

		if (deliveryRequest.status !== 'pending') {
			return res.status(400).json({
				success: false,
				message:
					'This request has already been accepted or rejected',
			});
		}

		// Mark it as rejected and clear the runner info
		deliveryRequest.runnerInfo = {};
		deliveryRequest.status = 'rejected';

		await deliveryRequest.save();

		// Emit an event to notify the customer/store that the order has been rejected
		io.emit('orderStatusUpdated', {
			message: 'Order rejected by runner',
			orderId: requestId,
		});

		res.status(200).json({
			success: true,
			message: 'Delivery request rejected successfully',
			deliveryRequest,
		});
	} catch (error) {
		console.error(
			'Error rejecting delivery request:',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Error rejecting delivery request',
		});
	}
};

export const getDeliveryRequestsForRunner = async (
	req,
	res,
) => {
	const { runnerId } = req.params; // Runner's ID passed in the request params

	try {
		// Find all delivery requests where the runner is assigned
		const deliveryRequests = await DeliveryRequest.find({
			'runnerInfo.runnerId': runnerId, // Match the runnerId in the runnerInfo object
			status: { $in: ['pending'] }, // Filter by 'pending' or 'accepted' status
		});

		// Return the found delivery requests
		res.status(200).json({
			success: true,
			count: deliveryRequests.length,
			data: deliveryRequests,
		});
	} catch (error) {
		// Handle any errors and return a 500 response
		console.error(error);
		res.status(500).json({
			message: 'Server error. Please try again later.',
		});
	}
};

export const getDeliveryRequestStatus = async (
	req,
	res,
) => {
	const { requestId } = req.params;

	try {
		const deliveryRequest = await DeliveryRequest.findById(
			requestId,
		);

		if (!deliveryRequest) {
			return res.status(404).json({
				success: false,
				message: 'Delivery request not found.',
			});
		}

		// Respond with the current status
		res.status(200).json({
			success: true,
			status: deliveryRequest.status,
		});
	} catch (error) {
		console.error(
			'Error fetching delivery request status:',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Server error. Please try again later.',
		});
	}
};
