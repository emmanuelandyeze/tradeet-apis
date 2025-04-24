import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// 1. Place Autocomplete
router.get('/autocomplete', async (req, res) => {
	try {
		const { input } = req.query;

		const response = await axios.get(
			'https://maps.googleapis.com/maps/api/place/autocomplete/json',
			{
				params: {
					input,
					key: GOOGLE_MAPS_API_KEY,
					types: 'geocode',
					language: 'en',
				},
			},
		);

		res.json(response.data);
	} catch (error) {
		console.error('Autocomplete Error:', error.message);
		res.status(500).json({ error: 'Autocomplete failed' });
	}
});

// 2. Place Details (get lat/lng from place_id)
router.get('/place-details', async (req, res) => {
	try {
		const { place_id } = req.query;

		const response = await axios.get(
			'https://maps.googleapis.com/maps/api/place/details/json',
			{
				params: {
					place_id,
					key: GOOGLE_MAPS_API_KEY,
				},
			},
		);

		res.json(response.data);
	} catch (error) {
		console.error('Place Details Error:', error.message);
		res.status(500).json({ error: 'Place details failed' });
	}
});

// 3. Reverse Geocoding (lat/lng → address)
router.get('/reverse-geocode', async (req, res) => {
	try {
		const { lat, lng } = req.query;

		const response = await axios.get(
			'https://maps.googleapis.com/maps/api/geocode/json',
			{
				params: {
					latlng: `${lat},${lng}`,
					key: GOOGLE_MAPS_API_KEY,
				},
			},
		);

		res.json(response.data);
	} catch (error) {
		console.error(
			'Reverse Geocoding Error:',
			error.message,
		);
		res
			.status(500)
			.json({ error: 'Reverse geocoding failed' });
	}
});

// 4. (Optional) Server-side Distance Calculation
router.get('/distance', (req, res) => {
	try {
		const { lat1, lon1, lat2, lon2 } = req.query;

		const toRad = (deg) => (deg * Math.PI) / 180;
		const R = 6371; // km

		const dLat = toRad(lat2 - lat1);
		const dLon = toRad(lon2 - lon1);

		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(toRad(lat1)) *
				Math.cos(toRad(lat2)) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);

		const c =
			2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		const distance = R * c;

		res.json({ distance }); // in km
	} catch (error) {
		console.error(
			'Distance Calculation Error:',
			error.message,
		);
		res
			.status(500)
			.json({ error: 'Distance calculation failed' });
	}
});

export default router;
