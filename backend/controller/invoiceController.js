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

  export const updateInvoice = async (req, res) => {
    try {
      console.log(req.body);  // Log the incoming data to verify it's correct
      const { invoiceId } = req.params;
      const updatedInvoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        req.body,
        { new: true }
      );
      if (!updatedInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.status(200).json({
        message: "Invoice updated successfully!",
        data: updatedInvoice
      });
    } catch (err) {
      console.error(err);  // Log the error for debugging
      res.status(500).json({ error: err.message });
    }
  };
  
// Get invoice by ID
export const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    
    res.status(200).json(invoice);
  } catch (err) {
    console.error(err);  // Log the error for debugging
    res.status(500).json({ error: err.message });
  }
};
