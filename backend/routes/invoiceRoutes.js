import { Router } from "express";
import { createInvoice, getInvoices, updateInvoice, getInvoiceById } from "../controller/invoiceController.js";

const invoicerouter = Router();

invoicerouter.post("/create", createInvoice);
invoicerouter.get("/get", getInvoices);
invoicerouter.put('/edit/:invoiceId', updateInvoice);
invoicerouter.get('/get/:invoiceId', getInvoiceById);

export default invoicerouter;
