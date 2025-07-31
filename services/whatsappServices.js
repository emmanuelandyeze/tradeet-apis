import axios from 'axios';

export const sendWelcomeMessage = async (business) => {
	try {
		const response = await axios.post(
			'https://graph.facebook.com/v22.0/432799279914651/messages',
			{
				messaging_product: 'whatsapp',
				to: business.phone,
				type: 'template',
				template: {
					name: 'tradeet_welcome', // make sure this template is pre-approved
					language: { code: 'en' },
					components: [
						{
							type: 'body',
							parameters: [
								{
									type: 'text',
									text: business.name || 'there',
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

		console.log(
			`WhatsApp welcome message sent to ${business.phone}`,
		);
		return response.data;
	} catch (error) {
		console.error(
			`Failed to send WhatsApp message to ${business.phone}:`,
			error.response?.data || error,
		);
		throw error;
	}
};
