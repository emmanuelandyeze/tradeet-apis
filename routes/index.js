import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
	res.send('Welcome to Tradeet!');
});

router.get('/api', (req, res) => {
	res.send('Welcome to Tradeet Mobile API');
});

export default router;
