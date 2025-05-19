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

	console.log(message);

	if (message?.interactive?.type === 'nfm_reply') {
		const responseJsonStr =
			message.interactive.nfm_reply.response_json;

		if (responseJsonStr) {
			try {
				const responseData = JSON.parse(responseJsonStr);
				const selectedCategory =
					responseData['screen_0_Select_a_category_0'];
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
				name: 'welcome_flow_2',
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
			`${api_url}/businesses`,
		);
		const allVendors = getVendors?.data?.data || [];
		// console.log('All Vendors:', allVendors);

		// Define category mapping
		const categoryMap = {
			'0_Food_and_drinks': 'food',
			'1_Cakes_and_snacks': 'cakes',
			'2_Fashion_and_apparels': 'fashion',
			'3_Beauty_and_cosmetics': 'beauty',
			'4_Phone_and_laptop_gadgets': 'gadgets',
			'5_Health_and_wellness': 'health',
		};

		// Get the target category from the map
		const targetCategory = categoryMap[category] || 'food'; // Default to 'food' if not matched

		// Filter vendors by category
		const filteredVendors = allVendors.filter((vendor) =>
			vendor?.category
				?.toLowerCase()
				.includes(targetCategory),
		);

		// Limit to 10 vendors
		const vendors = filteredVendors.slice(0, 10);

		// Construct rows for the list message
		const rows = vendors.map((vendor) => ({
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

		// Check if there are no vendors in the filtered list
		if (rows.length === 0) {
			await axios.post(
				`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
				{
					messaging_product: 'whatsapp',
					recipient_type: 'individual',
					to: from,
					type: 'text',
					text: {
						body: `No vendors available in the ${targetCategory} category at the moment.`,
					},
				},
				{
					headers: {
						Authorization: `Bearer ${process.env.FB_SECRET}`,
						'Content-Type': 'application/json',
					},
				},
			);
			return;
		}

		// Send the list message
		await axios.post(
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
						text: `Choose a Vendor in ${targetCategory}`,
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

		let products = [];
		let categories = [];
		let cards = [];

		// Fetch products or categories based on vendor's service type
		if (vendor?.serviceType === 'products') {
			// Fetch vendor products
			const getProducts = await axios.get(
				`${api_url}/businesses/products/${vendorId}`,
			);
			const allProducts = getProducts?.data?.products || [];
			products = allProducts.slice(0, 10);

			// Create cards for products
			cards = products.map((product, index) => ({
				card_index: index,
				components: [
					{
						type: 'header',
						parameters: [
							{
								type: 'image',
								image: {
									link:
										product.image ||
										'https://via.placeholder.com/150',
								},
							},
						],
					},
					{
						type: 'body',
						parameters: [
							{
								type: 'text',
								text: product.name || 'No name',
							},
							{
								type: 'text',
								text: product.price
									? `₦${product.price}`
									: 'Price not available',
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
		} else {
			// Fetch vendor categories
			const getCategories = await axios.get(
				`${api_url}/category/${vendorId}`,
			);
			const allCategories = getCategories?.data || [];
			categories = allCategories.slice(0, 10);

			// Create cards for categories
			cards = categories?.map((category, index) => ({
				card_index: index,
				components: [
					{
						type: 'header',
						parameters: [
							{
								type: 'image',
								image: {
									link:
										category.image ||
										'https://via.placeholder.com/150',
								},
							},
						],
					},
					{
						type: 'body',
						parameters: [
							{
								type: 'text',
								text: category.name || 'No name',
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
								text: `${vendor.storeLink}/categories/${category.slug}`,
							},
						],
					},
				],
			}));
		}

		// If no cards are available, send a fallback message
		if (!cards.length) {
			await axios.post(
				`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
				{
					messaging_product: 'whatsapp',
					to: from,
					type: 'text',
					text: {
						body: `Sorry, no items available for ${vendor.name} at the moment.`,
					},
				},
				{
					headers: {
						Authorization: `Bearer ${process.env.FB_SECRET}`,
						'Content-Type': 'application/json',
					},
				},
			);
			return;
		}

		// Send the carousel message
		await axios.post(
			`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
			{
				messaging_product: 'whatsapp',
				to: from,
				type: 'template',
				template: {
					name:
						vendor?.serviceType === 'products'
							? 'item_cards'
							: 'services_cards', // Your approved template name
					language: {
						code: 'en_US',
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