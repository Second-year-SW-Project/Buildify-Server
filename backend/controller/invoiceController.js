import Invoice from '../model/invoiceModel.js';

// Create invoice
export const createInvoice = async (req, res) => {
    try {
      const invoice = new Invoice(req.body);
      await invoice.save();
      res.status(201).json({ message: "Invoice saved successfully!" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

// get invoices
  export const getInvoices = async (req, res) => {
    try {
      const invoices = await Invoice.find();
      res.status(200).json(invoices);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };