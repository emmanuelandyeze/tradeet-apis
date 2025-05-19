import express from 'express';
import axios from 'axios'
import { findBusinessById, findBusinessesByServiceTypeAndCampus } from '../controllers/businessController.js';

const router = express.Router();

const VERIFY_TOKEN = '12345';
const PHONE_NUMBER_ID = '432799279914651';

const api_url = 'https://tradeet-api.onrender.com';

router.get('/', (req, res) => {
	const mode = req.query['hub.mode'];
	const token = req.query['hub.verify_token'];
	const challenge = req.query['hub.challenge'];

	if (mode === 'subscribe' && token === VERIFY_TOKEN) {
		console.log('WEBHOOK_VERIFIED');
		res.status(200).send(challenge);
	} else {
		res.sendStatus(403);
	}
});

router.post('/', async (req, res) => {
	const data = req.body;

	const changes = data?.entry?.[0]?.changes?.[0];
	const value = changes?.value;
	const message = value?.messages?.[0];
	const from = message?.from;
	const profileName =
		value?.contacts?.[0]?.profile?.name || 'there';

	const messageText = message?.text?.body?.toLowerCase(); // Normalize to lowercase

	// Check if the message is a text message
	if (
		messageText === 'hi' ||
		messageText === 'hello' ||
		messageText === 'shop'
	) {
		await sendWelcomeMessage(from, profileName);
	}

	console.log(message)

	if (message?.interactive?.type === 'nfm_reply') {
		const responseJsonStr =
			message.interactive.nfm_reply.response_json;
		if (responseJsonStr) {
			try {
				const responseData = JSON.parse(responseJsonStr);
				const selectedCategory =
					responseData[
						'screen_0_Select_product_category_0'
					];
				console.log(
					'User selected category:',
					selectedCategory,
				);
				// Call your function to send the vendor list based on the selected category
				await sendVendorList(from, selectedCategory);
			} catch (error) {
				console.error(
					'Error parsing response_json:',
					error,
				);
			}
		}
	}

	if (message?.interactive?.type === 'list_reply') {
		const selectedVendorId =
			message.interactive.list_reply.id;
		await handleVendorSelection(from, selectedVendorId);
	}

	// Respond with 200 to prevent retries from WhatsApp
	res.sendStatus(200);
});

async function sendWelcomeMessage(from, profileName) {
	await axios.post(
		`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
		{
			messaging_product: 'whatsapp',
			to: from,
			type: 'template',
			template: {
				name: 'welcome_flow',
				language: { code: 'en_US' },
				components: [
					{
						type: 'body',
						parameters: [
							{
								type: 'text',
								text: profileName,
							},
						],
					},
					{
						type: 'button',
						sub_type: 'flow',
						index: 0,
						parameters: [
							{
								type: 'payload',
								payload: 'START_FLOW',
							},
						],
					},
				],
			},
		},
		{
			headers: {
				Authorization: `Bearer ${process.env.FB_SECRET}`,
				'Content-Type': 'application/json',
			},
		},
	);
}

async function sendVendorList(from, category) {
	try {

		// Fetch vendors data from API
		const getVendors = await axios.get(
			`${api_url}/businesses`
		);

		const allVendors = getVendors?.data?.data;
		const vendors = allVendors?.slice(0, 10);
		console.log(vendors)

		// Construct rows for the list message
		const rows = vendors?.map((vendor) => ({
			id: vendor._id,
			title:
				vendor?.name?.length > 24
					? vendor?.name?.slice(0, 21) + '...'
					: vendor?.name,
			description:
				vendor?.description?.length > 72
					? vendor?.description?.slice(0, 69) + '...'
					: vendor?.description ||
					  'No description available',
		}));

		// Send the list message
		const response = await axios.post(
			`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
			{
				messaging_product: 'whatsapp',
				recipient_type: 'individual',
				to: from,
				type: 'interactive',
				interactive: {
					type: 'list',
					header: {
						type: 'text',
						text: `Choose a Vendor in ${category}`,
					},
					body: {
						text: 'Select a vendor to get more details:',
					},
					footer: {
						text: 'Powered by Tradeet Business',
					},
					action: {
						button: 'View Vendors',
						sections: [
							{
								title: 'Available Vendors',
								rows: rows,
							},
						],
					},
				},
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.FB_SECRET}`,
					'Content-Type': 'application/json',
				},
			},
		);

		console.log('Message sent successfully');

	} catch (error) {
		console.error(
			'Error sending message:',
			error.response?.data || error.message,
		);
	}
}


  
async function handleVendorSelection(from, vendorId) {
	try {
		console.log('Vendor ID:', vendorId);

		// Fetch vendor data from API
		const getVendor = await axios.get(
			`${api_url}/businesses/b/${vendorId}`,
		);
		const vendor = getVendor?.data?.business;

		// Fetch vendor products
		const getProducts = await axios.get(
			`${api_url}/businesses/products/${vendorId}`,
		);
		const allProducts = getProducts?.data?.products;

		const products = allProducts?.slice(0, 10);

		const cards = products?.map((product, index) => ({
			card_index: index,
			components: [
				{
					type: 'header',
					parameters: [
						{
							type: 'image',
							image: {
								link: product.image,
							},
						},
					],
				},
				{
					type: 'body',
					parameters: [
						{
							type: 'text',
							text: product.name,
						},
						{
							type: 'text',
							text: product.price,
						},
					],
				},
				{
					type: 'button',
					sub_type: 'url',
					index: '0',
					parameters: [
						{
							type: 'text',
							text: `${vendor.storeLink}/product/${product._id}`,
						},
					],
				},
			],
		}));

	
		await axios.post(
			`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
			{
				messaging_product: 'whatsapp',
				to: from,
				type: 'template',
				template: {
					name: 'item_cards', // Your approved template name
					language: {
						code: 'en_US', // Language code
					},
					components: [
						{
							type: 'body',
							parameters: [
								{
									type: 'text',
									text: vendor.name,
								},
							],
						},
						{
							type: 'carousel',
							cards: cards,
						},
					],
				},
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.FB_SECRET}`,
					'Content-Type': 'application/json',
				},
				timeout: 10000,
			},
		);

		console.log('Carousel sent successfully');
	} catch (error) {
		console.error(
			'Error sending carousel:',
			error.response?.data || error.message,
		);
	}
}

  
  

export default router;