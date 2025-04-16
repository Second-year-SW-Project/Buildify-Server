import { Transaction } from "../model/TransactionModel.js";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config({ path: "./config.env" }); // Load environment variables

console.log("Stripe Secret Key:", process.env.STRIPE_SECRET_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Use your Stripe test secret key

export const checkout = async (req, res) => {
    try {
        console.log("Checkout Request Body:", req.body);

        const { items, total, paymentMethodId } = req.body;

        // Validate request data
        if (!Array.isArray(items) || items.length === 0 || !total || !paymentMethodId) {
            return res.status(400).json({ message: "Invalid request data" });
        }

        for (let item of items) {
            if (!item._id || !item.quantity || !item.price) {
                return res.status(400).json({ message: "Invalid item data" });
            }
        }

        // Create a payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: (total) * 100, // Stripe expects the amount in cents
            currency: "usd",
            payment_method: paymentMethodId,
            confirm: true, // Automatically confirm the payment
            automatic_payment_methods: {
                enabled: true, // Enable automatic payment methods
                allow_redirects: "never", // Disable redirect-based payment methods
            },
        });

        console.log("Payment Intent:", paymentIntent);

        // Check if the payment was successful
        if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({ message: "Payment failed" });
        }

        // Save the transaction to the database
        const transaction = new Transaction({
            items,
            total,
            status: "Successful",
            user_id: "12345",
            paymentIntentId: paymentIntent.id,
        });

        await transaction.save();
        console.log("Transaction Saved:", transaction);

        return res.status(200).json({ message: "Transaction Successful", transaction });
    } catch (error) {
        console.error("Checkout error:", error);

        // Handle Stripe-specific errors
        if (error.type === "StripeCardError") {
            return res.status(400).json({ message: "Card declined", error: error.message });
        }

        return res.status(500).json({ message: "Transaction Failed", error: error.message });
    }
};