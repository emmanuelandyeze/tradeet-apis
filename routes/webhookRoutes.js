import express from 'express';
import axios from 'axios';
import Customer from '../models/Customer.js';

const router = express.Router();

const VERIFY_TOKEN = '12345';
const PHONE_NUMBER_ID = '432799279914651';
const GOOGLE_MAPS_API_KEY =
	'AIzaSyDB9u0LKWhMKSBImf97RJjD8KzNq8rfPMY';

const api_url = 'https://tradeet-api.onrender.com';

async function reverseGeocode(lat, lng) {
	try {
		const response = await axios.get(
			`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`,
		);

		const results = response.data.results;
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
			console.log('✅ New customer created:', from);
			await requestUserLocation(from, profileName);
		} else {
			console.log('👋 Returning customer:', from);
			await sendConfirmOrChangeLocation(from, customer);
		}
	}

	if (message?.interactive?.type === 'button_reply') {
		const buttonId = message?.interactive?.button_reply?.id;

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

export async function sendCategoryList(to) {
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
			description:
				category.description ||
				'View items in this category',
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
		let cards = [];

		// Fetch vendor products
		const getProducts = await axios.get(
			`${api_url}/products/store/${vendorId}/categories/${catId}`,
		);
		const allProducts = getProducts?.data || [];
		// products = allProducts?.slice(0, 10);
		products = allProducts
			.filter((p) => p.name && p.price && p._id) // Ensures no empty fields
			.slice(0, 5);

		// Pad with empty placeholders if fewer than 5
		while (products.length < 5) {
			products.push({
				_id: 'placeholder',
				name: 'Coming soon',
				price: '',
				image:
					'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
			});
		}

		// Create cards for products
		cards = products?.map((product, index) => ({
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
								? `${product.price}`
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

		// If no cards are available, send a fallback message
		if (!cards.length) {
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
		}

		// Send the carousel message
		await axios.post(
			`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
			{
				messaging_product: 'whatsapp',
				to: from,
				type: 'template',
				template: {
					name: 'item_cards',
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
