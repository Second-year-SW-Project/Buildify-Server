import mongoose from 'mongoose';
import { Transaction } from "../model/TransactionModel.js";
import Stripe from "stripe";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config({ path: "./config.env" }); // Load environment variables

console.log("Stripe Secret Key:", process.env.STRIPE_SECRET_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Use your Stripe test secret key

//  Configure your email transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // your email (example@gmail.com)
        pass: process.env.EMAIL_PASS, // app password (not your Gmail password!)
    },
});

export const checkout = async (req, res) => {
    try {
        console.log("Checkout Request Body:", req.body);

        const { items, total, paymentMethodId, customerEmail, customerName, user } = req.body;

        if (!Array.isArray(items) || items.length === 0 || !total || !paymentMethodId || !customerEmail) {
            return res.status(400).json({ message: "Invalid request data" });
        }

        for (let item of items) {
            if (!item._id || !item.quantity || !item.price) {
                return res.status(400).json({ message: "Invalid item data" });
            }
        }

        //  Create Stripe payment
        const paymentIntent = await stripe.paymentIntents.create({
            amount: total * 100,
            currency: "usd",
            payment_method: paymentMethodId,
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        });

        if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({ message: "Payment failed" });
        }

        // Save to DB
        const transaction = new Transaction({
            items,
            total,
            status: "Pending",
            user_id: user || "Test id",
            user_name: customerName || "Test User",
            email: customerEmail,
            profile_image: "../../client/public/logo.png",
            paymentIntentId: paymentIntent.id,
        });

        await transaction.save();

        //  Send confirmation email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: customerEmail,
            subject: "Your Order Confirmation - PC Components",
            html: `
        <h2>Thank you for your order, ${customerName || "Valued Customer"}! 🎉</h2>
        <p>Your transaction was successful. Here are your order details:</p>
        <ul>
          ${items.map((item) => `<li>${item.name} x ${item.quantity} - ${item.price * item.quantity} LKR</li>`).join("")}
        </ul>
        <h3>Total Paid: ${total.toLocaleString()} LKR</h3>
        <p>We’ll keep you updated when your order is on the way. 🛒</p>
      `,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
            } else {
                console.log("Confirmation email sent:", info.response);
            }
        });

        return res.status(200).json({ message: "Transaction Successful", transaction });
    } catch (error) {
        console.error("Checkout error:", error);

        if (error.type === "StripeCardError") {
            return res.status(400).json({ message: "Card declined", error: error.message });
        }

        return res.status(500).json({ message: "Transaction Failed", error: error.message });
    }
};


export const getOrders = async (req, res) => {
    try {
        const orders = await Transaction.find().sort({ createdAt: -1 });; // Fetch all orders from the database
        res.status(200).json({ Success: true, data: orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// Delete order by ID
export const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ Success: false, message: 'Invalid Order ID' });
        }

        const existingOrder = await Transaction.findByIdAndDelete(id);
        if (!existingOrder) {
            return res.status(404).json({ Success: false, message: 'Order not found' });
        }

        res.status(200).json({
            Success: true,
            message: `Order With #${existingOrder.id.slice(-4).toUpperCase()} Id Deleted Successfully`,
        });
    } catch (error) {
        console.error("Error deleting order:", error);
        return res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
    }
}

// Get transaction by user
export const getProductOrders = async (req, res) => {
    try {
        const orders = await Transaction.find({ user_id: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch orders", error: err.message });
    }
};


export const getSinglOrder = async (req, res) => {
    try {
        const order = await Transaction.findOne({ _id: req.params.id });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ message: "Error retrieving order", error: err.message });
    }
};


// Update status by order ID 
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedOrder = await Transaction.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.status(200).json({ message: "Order status updated", order: updatedOrder });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: "Failed to update order status" });
    }
};