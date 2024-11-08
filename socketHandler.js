import { io } from './server.js';

let runnerSockets = {};

export const onConnection = (socket) => {
	const runnerId = socket.handshake.query.runnerId;

	// Track the runner’s socket connection if runnerId exists
	if (runnerId) {
		runnerSockets[runnerId] = socket.id;
	}

	// Clean up when the runner disconnects
	socket.on('disconnect', () => {
		if (runnerId) {
			delete runnerSockets[runnerId];
		}
	});
};
