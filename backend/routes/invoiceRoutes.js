import { Router } from "express";
import { createInvoice, getInvoices } from "../controller/invoiceController.js";

const invoicerouter = Router();

invoicerouter.post("/create", createInvoice);
invoicerouter.get("/get", getInvoices);

export default invoicerouter;
