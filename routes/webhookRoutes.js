import express from 'express';
import axios from 'axios';
import Customer from '../models/Customer.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const VERIFY_TOKEN = '12345';
const PHONE_NUMBER_ID = '432799279914651';
const GOOGLE_MAPS_API_KEY =
	'AIzaSyDB9u0LKWhMKSBImf97RJjD8KzNq8rfPMY';

// const api_url = ' https://2aea6017dfeb.ngrok-free.app';
const api_url = 'https://tradeet-api.onrender.com';

async function reverseGeocode(lat, lng) {
	console.log(lat, lng);
	try {
		const response = await axios.get(
			`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
		);

		const results = response.data.results;
		console.log(results);
		if (results && results.length > 0) {
			return results[0].formatted_address;
		} else {
			return 'Unknown address';
		}
	} catch (error) {
		console.error(
			'❌ Google Maps reverse geocoding failed:',
			error.message,
		);
		return 'Unknown address';
	}
}

async function showTypingIndicator(id) {
	await axios.post(
		`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
		{
			messaging_product: 'whatsapp',
			status: 'read',
			message_id: id,
			typing_indicator: {
				type: 'text',
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
	const id = message?.id;
	const profileName =
		value?.contacts?.[0]?.profile?.name || 'there';

	console.log(message);

	const messageText = message?.text?.body
		?.toLowerCase()
		.trim();

	// ✅ Define flexible greeting triggers
	const greetingTriggers = [
		'hi',
		'hello',
		'hey',
		'shop',
		'start',
		'buy',
		'get started',
		'tradeet',
		'yo',
	];

	const store = ['fastmeal'];

	// ✅ Normalize and strip punctuation
	const cleanMessage = messageText?.replace(
		/[^\w\s]/gi,
		'',
	);

	if (greetingTriggers.includes(cleanMessage)) {
		let customer = await Customer.findOne({ phone: from });

		if (!customer) {
			customer = new Customer({
				phone: from,
				name: profileName,
				coins: 0,
			});
			await customer.save();
			await showTypingIndicator(id);
			await requestUserLocation(from, profileName);
		} else {
			console.log('👋 Returning customer:', from);
			await showTypingIndicator(id);
			await sendConfirmOrChangeLocation(from, customer);
		}
	}

	if (store.includes(cleanMessage)) {
		await showTypingIndicator(id);
		await handleSendVendorDetails(from);
	}

	if (message?.interactive?.type === 'button_reply') {
		const buttonId = message?.interactive?.button_reply?.id;
		await showTypingIndicator(id);

		if (buttonId === 'confirm_location') {
			await axios.post(
				`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
				{
					messaging_product: 'whatsapp',
					to: from,
					text: {
						body: '✅ Location confirmed! Let’s get shopping. 🛍️',
					},
				},
				{
					headers: {
						Authorization: `Bearer ${process.env.FB_SECRET}`,
						'Content-Type': 'application/json',
					},
				},
			);
			// Proceed to category list or next step
			await sendCategoryList(from); // Example next step
		}

		if (buttonId === 'change_location') {
			await requestUserLocation(from, profileName);
		}
	}

	if (message?.type === 'location') {
		const { latitude, longitude, name } = message.location;
		await showTypingIndicator(id);

		// ✅ Get the address from Google
		const address = await reverseGeocode(
			latitude,
			longitude,
		);

		// ✅ Save or update customer location
		await Customer.findOneAndUpdate(
			{ phone: from },
			{
				location: {
					type: 'Point',
					coordinates: [longitude, latitude],
					address: address,
				},
			},
			{ new: true },
		);

		console.log(
			`📍 Location saved for ${from}: ${address}`,
		);

		// ✅ Send confirmation message
		await axios.post(
			`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
			{
				messaging_product: 'whatsapp',
				to: from,
				text: {
					body: `📍 Your location has been saved as:\n${address}\n\nLet’s get shopping! 🛍️`,
				},
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.FB_SECRET}`,
					'Content-Type': 'application/json',
				},
			},
		);

		// Optionally proceed to next step (e.g., send category list)
		await sendCategoryList(from);
	}

	if (message?.interactive?.type === 'list_reply') {
		const selectedId = message.interactive.list_reply.id;
		console.log(`📦 User selected list ID: ${selectedId}`);
		await showTypingIndicator(id);

		if (selectedId.startsWith('vendor_')) {
			// 📌 User selected a vendor
			const vendorId = selectedId.split('vendor_')[1];
			await handleVendorSelection(from, vendorId);
		} else if (selectedId.startsWith('cat_')) {
			await sendVendorList(from, selectedId);
		} else if (selectedId.startsWith('vendorcat_')) {
			const [vendorId, catId] = selectedId
				.split('vendorcat_')[1]
				.split('_');
			await handleCategorySelection(from, vendorId, catId);
		} else if (selectedId.startsWith('vendorprod_')) {
			const [vendorId, prodId] = selectedId
				.split('vendorprod_')[1]
				.split('_');
			await handleMakeSelection(from, vendorId, prodId);
		} else {
			return;
		}
	}

	// ✅ Always respond with 200
	res.sendStatus(200);
});

async function sendConfirmOrChangeLocation(from, customer) {
	const address =
		customer?.location?.address || 'No address found';
	await axios.post(
		`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
		{
			messaging_product: 'whatsapp',
			to: from,
			type: 'interactive',
			interactive: {
				type: 'button',
				body: {
					text: `Welcome back ${customer.name} 👋.\n\nPlease confirm if this is your current address:\n\n📍 *${address}*`,
				},
				action: {
					buttons: [
						{
							type: 'reply',
							reply: {
								id: 'confirm_location',
								title: '✅ Confirm',
							},
						},
						{
							type: 'reply',
							reply: {
								id: 'change_location',
								title: '✏️ Change Location',
							},
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
}

async function requestUserLocation(from, profileName) {
	const safeName = profileName || 'there';
	await axios.post(
		`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
		{
			messaging_product: 'whatsapp',
			recipient_type: 'individual',
			type: 'interactive',
			to: from,
			interactive: {
				type: 'location_request_message',
				body: {
					text: `Hello ${safeName}, welcome to *Tradeet Campus* – your local marketplace on WhatsApp! \n\n📍To begin, kindly *share your current location* so we can find vendors near you.`,
				},
				action: {
					name: 'send_location',
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
}

async function sendCategoryList(to) {
	try {
		await axios.post(
			`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
			{
				messaging_product: 'whatsapp',
				recipient_type: 'individual',
				to,
				type: 'interactive',
				interactive: {
					type: 'list',
					header: {
						type: 'text',
						text: '🛍️ Shop by Category',
					},
					body: {
						text: 'Please select a category to discover nearby vendors:',
					},
					action: {
						button: 'Choose a category',
						sections: [
							{
								title: 'Available Categories',
								rows: [
									{
										id: 'cat_food',
										title: '🍔 Food & Drinks',
										description:
											'Restaurants, snacks, drinks, and more',
									},
									{
										id: 'cat_fashion',
										title: '👗 Fashion',
										description:
											'Clothing, shoes, bags, accessories',
									},
									{
										id: 'cat_electronics',
										title: '💻 Electronics',
										description:
											'Phones, gadgets, accessories, repairs',
									},
									{
										id: 'cat_groceries',
										title: '🛒 Groceries',
										description:
											'Provisions, fruits, household items',
									},
									{
										id: 'cat_services',
										title: '🧰 Services',
										description:
											'Repairs, laundry, salons, and more',
									},
									{
										id: 'cat_beauty',
										title: '💅 Beauty & Skincare',
										description:
											'Makeup, skincare, hair, and grooming',
									},
									{
										id: 'cat_health',
										title: '🩺 Health & Wellness',
										description:
											'Pharmacy, supplements, fitness',
									},
									{
										id: 'cat_stationery',
										title: '📚 Stationery & Books',
										description:
											'Books, supplies, educational materials',
									},
									// {
									// 	id: 'cat_home',
									// 	title: '🏠 Home & Living',
									// 	description:
									// 		'Furniture, decor, appliances',
									// },

									// {
									// 	id: 'cat_art',
									// 	title: '🎨 Art & Crafts',
									// 	description:
									// 		'Paintings, handmade items, DIY supplies',
									// },
									// {
									// 	id: 'cat_events',
									// 	title: '🎉 Events & Entertainment',
									// 	description:
									// 		'Catering, photography, rentals, DJs',
									// }
								],
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

		console.log(`✅ Category list sent to ${to}`);
	} catch (error) {
		console.error(
			'❌ Failed to send category list:',
			error.message,
		);
	}
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
		const CATEGORY_MAP = {
			cat_food: 'food',
			cat_fashion: 'fashion',
			cat_electronics: 'electronics',
			cat_groceries: 'food',
			cat_services: 'services',
			cat_beauty: 'beauty',
			cat_health: 'health',
			cat_home: 'home',
			cat_stationery: 'stationery',
			cat_art: 'art',
			cat_events: 'events',
		};

		// Get the target category from the map
		const targetCategory = CATEGORY_MAP[category] || 'food'; // Default to 'food' if not matched

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
			id: `vendor_${vendor._id}`,
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
			sendCategoryList(from);
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
						text: `Choose a Vendor in ${targetCategory} category`,
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
			'Error sending messages:',
			error.response?.data || error.message,
		);
	}
}

async function handleVendorSelection(from, vendorId) {
	try {
		// Fetch vendor data
		const getVendor = await axios.get(
			`${api_url}/businesses/b/${vendorId}`,
		);
		const vendor = getVendor?.data?.business;

		// Fetch vendor categories
		const getCategories = await axios.get(
			`${api_url}/category/${vendorId}`,
		);
		const allCategories = getCategories?.data || [];
		const categories = allCategories.slice(0, 10); // limit to 10

		if (!categories.length) {
			await axios.post(
				`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
				{
					messaging_product: 'whatsapp',
					to: from,
					type: 'text',
					text: {
						body: `😕 Sorry, no product categories are currently available for *${vendor.name}*.`,
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

		// Format WhatsApp list rows
		const rows = categories.map((category, index) => ({
			id: `vendorcat_${vendor._id}_${category._id}`, // format for later parsing
			title:
				category?.name?.length > 24
					? category?.name?.slice(0, 21) + '...'
					: category?.name,
			description: category.description || ' ',
		}));

		// Send WhatsApp list
		await axios.post(
			`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
			{
				messaging_product: 'whatsapp',
				to: from,
				type: 'interactive',
				interactive: {
					type: 'list',
					header: {
						type: 'text',
						text: `${vendor.name} Categories`,
					},
					body: {
						text: 'Please select a category to browse items:',
					},
					action: {
						button: 'View Categories',
						sections: [
							{
								title: 'Available Categories',
								rows,
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

		console.log(
			'✅ Vendor category list sent successfully.',
		);
	} catch (error) {
		console.error(
			'❌ Error sending vendor category list:',
			error.response?.data || error.message,
		);
	}
}

async function handleCategorySelection(
	from,
	vendorId,
	catId,
) {
	try {
		// Fetch vendor data
		const getVendor = await axios.get(
			`${api_url}/businesses/b/${vendorId}`,
		);
		const vendor = getVendor?.data?.business;

		let products = [];

		// Fetch vendor products
		const getProducts = await axios.get(
			`${api_url}/products/store/${vendorId}/categories/${catId}`,
		);
		const allProducts = getProducts?.data || [];
		// products = allProducts?.slice(0, 10);
		products = allProducts?.slice(0, 9);

		const rows = products.map((product, index) => ({
			id: `vendorprod_${vendor._id}_${product._id}`, // format for later parsing
			title:
				product?.name?.length > 24
					? product?.name?.slice(0, 21) + '...'
					: product?.name,
			description: '🏷️' + ' ₦' + product.price,
		}));

		// If no cards are available, send a fallback message
		if (!rows.length) {
			await axios.post(
				`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
				{
					messaging_product: 'whatsapp',
					to: from,
					type: 'text',
					text: {
						body: `Sorry, no items available for this category at the moment.`,
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
		} else {
			// Send the carousel message
			const res = await axios.post(
				`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
				{
					messaging_product: 'whatsapp',
					to: from,
					type: 'interactive',
					interactive: {
						type: 'list',

						body: {
							text: 'Please select an item to purchase:',
						},
						action: {
							button: 'View items',
							sections: [
								{
									title: 'Available Items',
									rows,
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
			console.log('✅ Product list sent successfully.');
			console.log(res.data.messages);
		}
	} catch (error) {
		console.error(
			'Error sending carousel:',
			error.response?.data || error.message,
		);
	}
}

async function handleMakeSelection(from, vendorId, prodId) {
	try {
		// Fetch vendor data
		const getVendor = await axios.get(
			`${api_url}/businesses/b/${vendorId}`,
		);
		const vendor = getVendor?.data?.business;

		// Send the text message
		const res = await axios.post(
			`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
			{
				messaging_product: 'whatsapp',
				recipient_type: 'individual',
				to: from,
				type: 'text',
				text: {
					preview_url: true,
					body: `As requested, here's the link to the product: \n \n https://tradeet.ng/store/${vendor?.storeLink}/product/${prodId}`,
				},
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.FB_SECRET}`,
					'Content-Type': 'application/json',
				},
			},
		);
		console.log('✅ Product link sent successfully.');
		console.log(res.data.messages);
	} catch (error) {
		console.error(
			'Error sending carousel:',
			error.response?.data || error.message,
		);
	}
}

async function handleSendVendorDetails(to) {
	const accessToken = process.env.FB_SECRET;
	const url =
		'https://graph.facebook.com/v22.0/432799279914651/messages';
	const message =
		'Hello everyone this is Emmanuel testing the Tradeet Whatsapp Store.';
	try {
		const response = await axios.post(
			url,
			{
				messaging_product: 'whatsapp',
				to: to, // Use the 'to' parameter
				type: 'template',
				template: {
					name: 'vendor_details',
					language: {
						code: 'en',
					},
					components: [
						{
							type: 'body',
							parameters: [
								{
									type: 'text',
									text: message, // Use the passed message
								},
							],
						},
						{
							type: 'button',
							sub_type: 'flow',
							index: 0,
							parameters: {
								action: {
									flow_id: '1510687943251440', // Add your Flow ID from environment variable
									mode: 'published', // Use 'published' for production
									flow_action_data: {}, // Optional: Add any initial data for the flow
									flow_token: 'test', // Required: Unique token for the flow
								},
							},
						},
					],
				},
			},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
			},
		);

		// Log successful response
		console.log('Response:', response.data);
		if (response.data.messages && response.data.contacts) {
			console.log(
				'Message ID:',
				response.data.messages[0].id,
			);
			console.log(
				'Recipient WA ID:',
				response.data.contacts[0].wa_id,
			);
		}

		return response.data;
	} catch (error) {
		console.error(error);
	}
}

export default router;
