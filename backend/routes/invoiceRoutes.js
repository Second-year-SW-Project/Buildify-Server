import { Router } from "express";
import Invoice from '../model/invoiceModel.js';

const invoicerouter = Router();

invoicerouter.post("/create", async(req, res) => {
    try{
        const invoice = new Invoice(req.body);
        await invoice.save();
        res.status(201).json({ message: "Invoice saved succesfully!"});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

export default invoicerouter;
