import Invoice from "../model/invoiceModel.js";

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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Extract filters from query params
  const { search, startDate, endDate } = req.query;

  // Build the query object
  const query = {};

  if (search) {
    // Case-insensitive partial match on invoiceNumber
    query.invoiceNumber = { $regex: search, $options: "i" };
  }

  if (startDate) {
    query.dateCreated = { ...query.dateCreated, $gte: new Date(startDate) };
  }

  if (endDate) {
    query.dueDate = { ...query.dueDate, $lte: new Date(endDate) };
  }

  try {
    const [invoices, totalCount] = await Promise.all([
      Invoice.find(query).skip(skip).limit(limit),
      Invoice.countDocuments(query),
    ]);

    res.status(200).json({
      data: invoices,
      totalCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    console.log(req.body); // Log the incoming data to verify it's correct
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
      data: updatedInvoice,
    });
  } catch (err) {
    console.error(err); // Log the error for debugging
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
    console.error(err); // Log the error for debugging
    res.status(500).json({ error: err.message });
  }
};

// Delete invoice by ID
export const deleteInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const deletedInvoice = await Invoice.findByIdAndDelete(invoiceId);

    if (!deletedInvoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.status(200).json({ message: "Invoice deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
