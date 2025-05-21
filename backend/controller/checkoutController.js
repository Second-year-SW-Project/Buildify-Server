import mongoose from 'mongoose';
import { Transaction } from "../model/TransactionModel.js";
import Stripe from "stripe";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import Product from "../model/productModel.js";
import User from "../model/userModel.js";

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

        const { items, total, paymentMethodId, customerEmail, customerName, customerAddress, customerNumber, user } = req.body;

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
            address: customerAddress,
            number: customerNumber,
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
        const {
            search,
            query,
            date,
            orderId,
            page = 1,
            limit = 5,
            status
        } = req.query;
        const searchQuery = search || query; // Support both search and query parameters
        const queryObj = {};

        // Add status filter if provided
        if (status && status !== 'All') {
            queryObj.status = status;
        }

        // Add Order ID search 
        if (orderId) {
            // Match the orderId at the end of the ObjectId string
            queryObj.$expr = {
                // Match the input(ObjectId) with the orderId
                $regexMatch: {
                    input: {
                        //Extract the last 4 characters from ObjectId
                        $substrCP: [
                            { $toString: "$_id" }, // Convert ObjectId to string
                            { $subtract: [{ $strLenCP: { $toString: "$_id" } }, 4] }, // Start from the 4th last character
                            4
                        ]
                    },
                    // Match the orderId at the beginning of the string
                    regex: new RegExp(`^${orderId}`, 'i')
                }
            };
        }

        if (searchQuery) {
            queryObj.$or = [
                { user_name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } },
                { status: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        // Add date filter
        if (date) {
            const filterDate = new Date(date);
            const nextDay = new Date(filterDate);
            nextDay.setDate(nextDay.getDate() + 1);

            // Filter products updated within the date range
            queryObj.createdAt = {
                $gte: filterDate,
                $lt: nextDay
            };
        }

        // Get status counts
        const statusCounts = await Transaction.aggregate([
            {
                // Match the query object
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Convert status counts to object
        const statusCountsObj = statusCounts.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        // Calculate skip value for pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get total count of Orders
        const totalOrders = await Transaction.countDocuments(queryObj);

        const orders = await Transaction.find(queryObj)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Fetch product details for each order's items
        const ordersWithDetails = await Promise.all(orders.map(async (order) => {
            const orderObj = order.toObject();

            // Fetch product details for each item
            const itemsWithDetails = await Promise.all(orderObj.items.map(async (item) => {
                try {
                    // Check if item._id is a valid ObjectId
                    if (!mongoose.Types.ObjectId.isValid(item._id)) {
                        console.warn(`Invalid ObjectId: ${item._id}`);
                        return item;
                    }

                    const product = await Product.findById(item._id);

                    // Check if product exists
                    if (product) {
                        return {
                            ...item,
                            productDetails: {
                                name: product.name,
                                type: product.type,
                                price: product.price,
                                image: product.img_urls?.[0]?.url || null
                            }
                        };
                    }
                    return item;

                } catch (error) {
                    console.error(`Error fetching product details for ${item._id}:`, error);
                }
            }));

            // Fetch user details if user_id exists
            let userDetails = null;
            // Check if user_id is a valid ObjectId
            if (orderObj.user_id) {
                try {
                    // Check if user_id is a valid ObjectId
                    if (!mongoose.Types.ObjectId.isValid(orderObj.user_id)) {
                        console.warn(`Invalid ObjectId: ${orderObj.user_id}`);
                        return orderObj;
                    }

                    const user = await User.findById(orderObj.user_id);

                    // Check if user exists
                    if (user) {
                        userDetails = {
                            name: user.name,
                            email: user.email,
                            profilePicture: user.profilePicture
                        };
                    }

                } catch (error) {
                    console.error(`Error fetching user details for ${orderObj.user_id}:`, error);
                }
            }

            return {
                ...orderObj,
                items: itemsWithDetails,
                userDetails
            };
        }));

        res.status(200).json({
            Success: true,
            data: ordersWithDetails,
            pagination: {
                total: totalOrders,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalOrders / parseInt(limit))
            },
            statusCounts: statusCountsObj
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
    }
};

// Delete order by ID
export const deleteOrder = async (req, res) => {
    try {
        //Extract order ID from request parameters
        const { id } = req.params;

        // Check if the ID is a valid 
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ Success: false, message: 'Invalid Order ID' });
        }

        // Find and delete the order by ID
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
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        const orders = await Transaction.find({ user_id: userId }).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch orders", error: err.message });
    }
};


// export const getSinglOrder = async (req, res) => {
//     try {
//         const order = await Transaction.findOne({ _id: req.params.id });

//         if (!order) {
//             return res.status(404).json({ message: "Order not found" });
//         }

//         res.status(200).json(order);
//     } catch (err) {
//         res.status(500).json({ message: "Error retrieving order", error: err.message });
//     }
// };

export const getSingleOrder = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ Success: false, message: `Invalid order ID: ${id}` });
        }

        // Fetch order
        const order = await Transaction.findById(id);
        if (!order) {
            return res.status(404).json({ Success: false, message: `Order not found for ID: ${id}` });
        }

        console.log("Fetched Order:", {
            id: order._id,
            createdAt: order.createdAt,
            stepTimestamps: order.stepTimestamps
        });

        // Convert order to plain object
        const orderObj = order.toObject();

        // Fetch product details for each item
        const itemsWithDetails = await Promise.all(orderObj.items.map(async (item) => {
            try {
                // Check if item._id is a valid ObjectId
                if (!mongoose.Types.ObjectId.isValid(item._id)) {
                    console.warn(`Invalid ObjectId: ${item._id}`);
                    return item;
                }

                const product = await Product.findById(item._id);

                // Check if product exists
                if (product) {
                    return {
                        ...item,
                        productDetails: {
                            name: product.name,
                            type: product.type,
                            price: product.price,
                            image: product.img_urls?.[0]?.url || null
                        }
                    };
                }
                return item;

            } catch (error) {
                console.error(`Error fetching product details for ${item._id}:`, error);
                return item;
            }
        }));

        // Fetch user details if user_id exists
        let userDetails = null;
        if (orderObj.user_id) {
            try {
                // Check if user_id is a valid ObjectId
                if (!mongoose.Types.ObjectId.isValid(orderObj.user_id)) {
                    console.warn(`Invalid ObjectId: ${orderObj.user_id}`);
                } else {
                    const user = await User.findById(orderObj.user_id);
                    // Check if user exists
                    if (user) {
                        userDetails = {
                            name: user.name,
                            email: user.email,
                            profilePicture: user.profilePicture
                        };
                    }
                }
            } catch (error) {
                console.error(`Error fetching user details for ${orderObj.user_id}:`, error);
            }
        }

        // Combine all details
        const orderWithDetails = {
            ...orderObj,
            items: itemsWithDetails,
            userDetails
        };

        res.status(200).json({
            Success: true,
            data: orderWithDetails
        });

    } catch (error) {
        console.error('Error in getSingleOrder:', error);
        res.status(500).json({
            Success: false,
            message: `Server error: ${error.message}`
        });
    }
};


// Update status by order ID 
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, stepTimestamp } = req.body;

        const updateData = { status };

        // If stepTimestamp is provided, update the specific step timestamp
        if (stepTimestamp) {
            // Create an update object for each timestamp
            const timestampUpdates = {};
            Object.entries(stepTimestamp).forEach(([key, value]) => {
                if (value === null) {
                    // If value is null, unset the field
                    timestampUpdates[`stepTimestamps.${key}`] = 1;
                } else {
                    // Otherwise set the new value
                    timestampUpdates[`stepTimestamps.${key}`] = value;
                }
            });

            // Add the timestamp updates to the update data
            updateData.$set = timestampUpdates;
        }

        // If status is Pending, ensure we use createdAt
        if (status === 'Pending') {
            const order = await Transaction.findById(id);
            if (order) {
                updateData.$set = {
                    ...updateData.$set,
                    'stepTimestamps.Pending': order.createdAt
                };
            }
        }

        const updatedOrder = await Transaction.findByIdAndUpdate(
            id,
            updateData,
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