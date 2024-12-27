import Invoice from '../models/Invoice.js';

export const createInvoice = async (req, res) => {
	const { customerName, customerDetails, products } =
		req.body;

	const totalAmount = products.reduce(
		(sum, product) =>
			sum + product.price * product.quantity,
		0,
	);

	const invoice = new Invoice({
		customerName,
		customerDetails,
		products,
		totalAmount,
	});

	try {
		const savedInvoice = await invoice.save();
		res.status(201).json(savedInvoice);
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Failed to create invoice', error });
	}
};

export const getInvoices = async (req, res) => {
	try {
		const invoices = await Invoice.find();
		res.status(200).json(invoices);
	} catch (error) {
		res
			.status(500)
			.json({ message: 'Failed to fetch invoices', error });
	}
};
