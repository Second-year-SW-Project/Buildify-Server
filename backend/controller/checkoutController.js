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
        <p>We'll keep you updated when your order is on the way. 🛒</p>
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


export const getOrderList = async (req, res) => {
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

        // Use aggregation pipeline to get orders with product and user details
        const orders = await Transaction.aggregate([
            { $match: queryObj },
            { $sort: { updatedAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    let: { productId: { $toObjectId: "$items._id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$productId"] },
                            },
                        },
                        {
                            $project: {
                                name: 1,
                                price: 1,
                                img_urls: 1,
                            },
                        },
                    ],
                    as: "productDetails",
                },
            },
            { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
            // Add lookup for user details
            {
                $lookup: {
                    from: "users",
                    let: { userId: { $toObjectId: "$user_id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$userId"] },
                            },
                        },
                        {
                            $project: {
                                name: 1,
                                email: 1,
                                profilePicture: 1,
                            },
                        },
                    ],
                    as: "userDetails",
                },
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$_id",
                    items: {
                        $push: {
                            _id: "$items._id",
                            quantity: "$items.quantity",
                            name: "$productDetails.name",
                            price: "$productDetails.price",
                            product_image: {
                                $arrayElemAt: ["$productDetails.img_urls.url", 0],
                            },
                        },
                    },
                    total: { $first: "$total" },
                    status: { $first: "$status" },
                    user_id: { $first: "$user_id" },
                    user_name: { $first: "$userDetails.name" },
                    email: { $first: "$userDetails.email" },
                    address: { $first: "$address" },
                    number: { $first: "$number" },
                    createdAt: { $first: "$createdAt" },
                    stepTimestamps: { $first: "$stepTimestamps" },
                    profilePicture: { $first: "$userDetails.profilePicture" },
                    userDetails: { $first: "$userDetails" }
                },
            },
        ]);

        res.status(200).json({
            Success: true,
            data: orders,
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

        const orders = await Transaction.aggregate(
            [
                { $match: { user_id: userId } },
                { $sort: { createdAt: -1 } },
                { $unwind: "$items" },
                {
                    $lookup: {
                        from: "products",
                        let: { productId: { $toObjectId: "$items._id" } },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$productId"] },
                                },
                            },
                            {
                                $project: {
                                    name: 1,
                                    price: 1,
                                    img_urls: 1,
                                },
                            },
                        ],

                        as: "productDetails",
                    },
                },
                //Simplify productDetails array into single object
                { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },

                {
                    $group: {
                        _id: "$_id",
                        items: {
                            $push: {
                                _id: "$items._id",
                                quantity: "$items.quantity",
                                name: "$productDetails.name",
                                price: "$productDetails.price",
                                product_image: {
                                    $arrayElemAt: ["$productDetails.img_urls.url", 0],
                                },
                            },
                        },
                        total: { $first: "$total" },
                        status: { $first: "$status" },
                        user_id: { $first: "$user_id" },
                        user_name: { $first: "$user_name" },
                        email: { $first: "$email" },
                        createdAt: { $first: "$createdAt" },
                    },
                },
                { $sort: { createdAt: -1 } },
            ]
        );

        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch orders", error: err.message });
    }
};

export const getOrderSummary = async (req, res) => {
    try {
        console.log('getOrderSummary called with query:', req.query);
        const { page = 1, limit = 5 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get total count of pending orders
        const totalOrders = await Transaction.countDocuments({ status: "Pending" });
        console.log('Total pending orders:', totalOrders);

        // Use aggregation pipeline to get pending orders with user details
        const orders = await Transaction.aggregate([
            { $match: { status: "Pending" } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            // Add lookup for user details
            {
                $lookup: {
                    from: "users",
                    let: { userId: { $toObjectId: "$user_id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$userId"] },
                            },
                        },
                        {
                            $project: {
                                name: 1,
                                email: 1,
                                profilePicture: 1,
                            },
                        },
                    ],
                    as: "userDetails",
                },
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    items: 1,
                    total: 1,
                    status: 1,
                    user_id: 1,
                    user_name: "$userDetails.name",
                    email: "$userDetails.email",
                    address: 1,
                    number: 1,
                    createdAt: 1,
                    profilePicture: "$userDetails.profilePicture"
                }
            }
        ]);

        console.log('Found orders:', orders.length);

        res.status(200).json({
            Success: true,
            data: orders,
            pagination: {
                total: totalOrders,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalOrders / parseInt(limit))
            }
        });
    } catch (err) {
        console.error("Error in getOrderSummary:", err);
        res.status(500).json({
            Success: false,
            message: "Failed to fetch orders",
            error: err.message
        });
    }
};

// ...existing code...
export const getOrdersSummaryTotals = async (req, res) => {
    try {
        const { filter = 'All' } = req.query;

        // Date range logic
        let dateFilter = {};
        if (filter !== 'All') {
            const now = new Date();
            let start, end = new Date(now);
            switch (filter) {
                case 'today':
                    start = new Date(now.setHours(0, 0, 0, 0));
                    end = new Date(now.setHours(23, 59, 59, 999));
                    break;
                case 'yesterday':
                    start = new Date(now.setDate(now.getDate() - 1));
                    start.setHours(0, 0, 0, 0);
                    end = new Date(now.setHours(23, 59, 59, 999));
                    break;
                case 'thisweek':
                    const today = new Date();
                    const day = today.getDay();
                    const diffToMonday = day === 0 ? -6 : 1 - day;

                    start = new Date(today);
                    start.setDate(today.getDate() + diffToMonday);
                    start.setHours(0, 0, 0, 0);

                    end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    end.setHours(23, 59, 59, 999);
                    console.log('This week start:', start, 'end:', end);
                    break;
                case 'lastweek': {
                    const today = new Date();
                    const day = today.getDay();

                    const diffToLastMonday = day === 0 ? 13 : 7 + (day - 1);

                    start = new Date(today);
                    start.setDate(today.getDate() - diffToLastMonday);
                    start.setHours(0, 0, 0, 0);

                    end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    end.setHours(23, 59, 59, 999);
                    break;
                }

                case 'thismonth':
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    break;
                case 'lastmonth': {
                    const today = new Date();
                    const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
                    const month = today.getMonth() === 0 ? 11 : today.getMonth() - 1;

                    start = new Date(year, month, 1);
                    end = new Date(year, month + 1, 0, 23, 59, 59, 999);
                    break;
                }
                default:
                    start = null;
                    end = null;
            }
            if (start && end) {
                dateFilter = {
                    createdAt: { $gte: start, $lte: end }
                };
            }
        }

        // Total Orders (excluding cancelled/refunded)
        const totalOrders = await Transaction.countDocuments({
            status: { $nin: ['Canceled', 'Refunded'] },
            ...dateFilter
        });

        // Pending Orders
        const pendingOrders = await Transaction.countDocuments({
            status: 'Pending',
            ...dateFilter
        });

        // Total Price (Shipped/Delivered)
        const totalPriceAgg = await Transaction.aggregate([
            { $match: { status: { $in: ['Successful'] }, ...dateFilter } },
            { $group: { _id: null, total: { $sum: "$total" } } }
        ]);
        const totalPrice = totalPriceAgg[0]?.total || 0;

        res.status(200).json({
            totalOrders,
            pendingOrders,
            totalPrice
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch order summary", error: err.message });
    }
};

export const getSingleOrder = async (req, res) => {
    try {
        const orderId = req.params.id;

        const orders = await Transaction.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    let: { productId: { $toObjectId: "$items._id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$productId"] },
                            },
                        },
                        {
                            $project: {
                                name: 1,
                                price: 1,
                                img_urls: 1,
                            },
                        },
                    ],
                    as: "productDetails",
                },
            },
            { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
            // Add lookup for user details
            {
                $lookup: {
                    from: "users",
                    let: { userId: { $toObjectId: "$user_id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$userId"] },
                            },
                        },
                        {
                            $project: {
                                name: 1,
                                email: 1,
                                profilePicture: 1,
                            },
                        },
                    ],
                    as: "userDetails",
                },
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$_id",
                    items: {
                        $push: {
                            _id: "$items._id",
                            quantity: "$items.quantity",
                            name: "$productDetails.name",
                            price: "$productDetails.price",
                            product_image: {
                                $arrayElemAt: ["$productDetails.img_urls.url", 0],
                            },
                        },
                    },
                    total: { $first: "$total" },
                    status: { $first: "$status" },
                    user_id: { $first: "$user_id" },
                    user_name: { $first: "$user_name" },
                    email: { $first: "$email" },
                    address: { $first: "$address" },
                    number: { $first: "$number" },
                    createdAt: { $first: "$createdAt" },
                    stepTimestamps: { $first: "$stepTimestamps" },
                    profilePicture: { $first: "$userDetails.profilePicture" },
                },
            },
        ]);
        if (!orders.length) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.status(200).json(orders[0]);
    } catch (err) {
        res.status(500).json({ message: "Error retrieving order", error: err.message });
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

export const getBarChartSummary = async (req, res) => {
    try {
        const { filter = "thisweek" } = req.query;
        let dateFilter = {};
        if (filter !== 'All') {
            const now = new Date();
            let start, end;
            switch (filter) {
                case 'today':
                    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                    break;
                case 'yesterday': {
                    const yest = new Date(now);
                    yest.setDate(now.getDate() - 1);
                    start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0);
                    end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999);
                    break;
                }
                case 'thisweek': {
                    const today = new Date();
                    const day = today.getDay();
                    const diffToMonday = day === 0 ? -6 : 1 - day;

                    start = new Date(today);
                    start.setDate(today.getDate() + diffToMonday);
                    start.setHours(0, 0, 0, 0);

                    end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    end.setHours(23, 59, 59, 999);
                    console.log('This week start:', start, 'end:', end);
                    break;
                }
                case 'lastweek': {
                    const today = new Date();
                    const day = today.getDay();

                    const diffToLastMonday = day === 0 ? 13 : 7 + (day - 1);

                    start = new Date(today);
                    start.setDate(today.getDate() - diffToLastMonday);
                    start.setHours(0, 0, 0, 0);

                    end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    end.setHours(23, 59, 59, 999);
                    console.log('This last start:', start, 'end:', end);
                    break;
                }
                case 'thismonth':
                    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    break;
                case 'lastmonth': {
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1, 0, 0, 0, 0);
                    end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59, 999);
                    break;
                }
                case 'thisyear':
                    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
                    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                    break;
                case 'lastyear':
                    start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
                    end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
                    break;
                default:
                    start = null;
                    end = null;
            }
            if (start && end) {
                dateFilter = { createdAt: { $gte: start, $lte: end } };
            }
        }
        // Fetch orders in date range
        const orders = await Transaction.find(dateFilter);
        // Grouping logic (auto by day for week/month/year, by month for year, by day for week/month, by hour for today)
        let groupBy;
        if (filter === 'thisyear' || filter === 'lastyear') {
            groupBy = (order) => {
                const d = new Date(order.createdAt);
                return d.toLocaleString('default', { month: 'long' });
            };
        } else if (filter === 'thismonth' || filter === 'lastmonth') {
            groupBy = (order) => {
                const d = new Date(order.createdAt);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            };
            // } else if (filter === 'thisweek' || filter === 'lastweek') {
            //     groupBy = (order) => {
            //         const d = new Date(order.createdAt);
            //         return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            //     };
        } else if (filter === 'today' || filter === 'yesterday') {
            groupBy = (order) => {
                const d = new Date(order.createdAt);
                return `${d.getHours().toString().padStart(2, '0')}:00`;
            };
        } else {
            // week
            groupBy = (order) => {
                const d = new Date(order.createdAt);
                return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            };
        }
        const buckets = {};
        orders.forEach(order => {
            const bucket = groupBy(order);
            if (!buckets[bucket]) buckets[bucket] = [];
            buckets[bucket].push(order);
        });
        const xLabels = Object.keys(buckets).sort();
        console.log('BarChart xLabels (backend):', xLabels);
        const sales = [], refund = [], cancle = [], other = [];
        // New: rawCancleOrders for frontend filtering
        const rawCancleOrders = {};
        xLabels.forEach(label => {
            const group = buckets[label];
            sales.push(group.filter(o => o.status !== "Refunded" && o.status !== "Canceled").reduce((sum, o) => sum + (o.total || 0), 0));
            refund.push(group.filter(o => o.status === "Refunded").reduce((sum, o) => sum + (o.total || 0), 0));
            // For cancled, collect the actual orders for frontend filtering
            const cancledOrders = group.filter(o => o.status === "Canceled");
            cancle.push(cancledOrders.reduce((sum, o) => sum + (o.total || 0), 0));
            other.push(group.filter(o => o.status === "Refunded").reduce((sum, o) => sum + (o.deliveryCharge || 0), 0));
            // Store the canceled orders with total and stepTimestamps.Successful
            rawCancleOrders[label] = cancledOrders.map(o => ({ total: o.total, stepTimestamps: o.stepTimestamps }));
        });
        res.status(200).json({ xLabels, sales, refund, cancle, other, rawCancleOrders });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch bar chart summary", error: err.message });
    }
};