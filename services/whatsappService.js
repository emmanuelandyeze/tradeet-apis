import axios from 'axios';

const sendWhatsAppMessage = async (phone, message) => {
	const accessToken = process.env.FB_SECRET;
	const url =
		'https://graph.facebook.com/v21.0/432799279914651/messages';

	try {
		const response = await axios.post(
			url,
			{
				messaging_product: 'whatsapp',
				to: phone, // Ensure the correct phone number
				type: 'template',
				template: {
					name: 'reset_password',
					language: {
						code: 'en',
					},
					components: [
						{
							type: 'body',
							parameters: [
								{
									type: 'text',
									text: message,
								},
							],
						},
						{
							type: 'button',
							sub_type: 'copy_code', // Correct sub_type
							index: '0',
							parameters: [
								{
									type: 'coupon_code', // Correct parameter type
									coupon_code: message, // Ensure message is a valid OTP string
								},
							],
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

		console.log('Response:', response.data);
		// Further logging
		console.log(
			'Message ID:',
			response.data.messages[0].id,
		);
		console.log(
			'Recipient WA ID:',
			response.data.contacts[0].wa_id,
		);
	} catch (error) {
		console.error(
			'Error sending message:',
			error.response ? error.response.data : error.message,
		);
	}
};

export default sendWhatsAppMessage;
