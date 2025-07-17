// controller/buildTransactionController.js
import mongoose from "mongoose";
import { BuildTransaction } from "../model/BuildTransactionModel.js";
import buildModel from "../model/buildModel.js";
import { Transaction } from "../model/TransactionModel.js"; // Import for type differentiation
import Stripe from "stripe";
// Helper function to generate pickup code
function generatePickupCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Helper function to calculate service charge based on number of components
function calculateServiceCharge(componentsCount) {
    if (componentsCount <= 8) {
        return 1000; // Rs. 1000 for 8 or fewer parts
    } else {
        const additionalParts = componentsCount - 8;
        return 1000 + additionalParts * 100; // Rs. 100 for each additional part
    }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create Build Transaction with comprehensive data from continue purchase page
export const createBuildTransaction = async (req, res) => {
    try {
        const {
            buildId,
            buildData,
            selectedComponents,
            paymentMethodId,
            customerInfo,
            addressInfo,
            deliveryMethod,
            deliveryInfo,
            pricingBreakdown,
            buildOptions = {},
        } = req.body;

        console.log("Received build transaction data:", {
            buildId,
            buildData: buildData ? "Present" : "Missing",
            selectedComponents: selectedComponents
                ? `${selectedComponents.length} components`
                : "Missing",
            customerInfo: customerInfo ? "Present" : "Missing",
            addressInfo: addressInfo ? "Present" : "Missing",
            deliveryMethod,
            deliveryInfo: deliveryInfo ? "Present" : "Missing",
            pricingBreakdown: pricingBreakdown ? "Present" : "Missing",
        });

        // Validate required data
        if (
            !buildId ||
            !buildData ||
            !selectedComponents ||
            !customerInfo ||
            !pricingBreakdown
        ) {
            return res.status(400).json({
                message: "Missing required build transaction data",
                required: [
                    "buildId",
                    "buildData",
                    "selectedComponents",
                    "customerInfo",
                    "pricingBreakdown",
                ],
            });
        }

        // Fetch the build details
        const build = await buildModel.findById(buildId);
        if (!build) {
            return res.status(404).json({ message: "Build not found" });
        }

        console.log("Build image sources:", {
            "buildData.image": buildData.image,
            "buildData.buildImage": buildData.buildImage,
            "build.image": build.image,
            "buildData keys": Object.keys(buildData),
        });

        // Process components data from continue purchase page
        const processedComponents = selectedComponents.map((component) => ({
            componentId: component._id || component.componentId,
            name: component.name,
            type: component.type,
            manufacturer: component.manufacturer,
            price: component.price,
            quantity: component.quantity || 1,
            image:
                component.image || (component.img_urls && component.img_urls[0]?.url),
            specifications: {
                // Store any additional component specifications
                ...component.specifications,
                description: component.description,
                model: component.model,
                features: component.features,
            },
        }));

        // Calculate comprehensive pricing
        const componentsPrice =
            pricingBreakdown.componentsPrice || pricingBreakdown.componentCost;
        const serviceCharge =
            pricingBreakdown.serviceCharge ||
            calculateServiceCharge(selectedComponents.length);
        const deliveryCharge =
            deliveryMethod === "Home Delivery"
                ? pricingBreakdown.deliveryCharge || 0
                : 0;
        const assemblyCharge = buildOptions.assemblyRequired
            ? pricingBreakdown.assemblyCharge || 150
            : 0;
        const qualityTestingCharge = buildOptions.qualityTesting
            ? pricingBreakdown.qualityTestingCharge || 50
            : 0;
        const total =
            componentsPrice +
            serviceCharge +
            deliveryCharge +
            assemblyCharge +
            qualityTestingCharge;

        console.log("Calculated pricing:", {
            componentsPrice,
            serviceCharge,
            deliveryCharge,
            assemblyCharge,
            qualityTestingCharge,
            total,
        });

        // Process payment through Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: total * 100,
            currency: "usd",
            payment_method: paymentMethodId,
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        });

        if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({
                message: "Payment failed",
                paymentError: paymentIntent.last_payment_error?.message,
            });
        }

        // Generate pickup code if store pickup is selected
        const pickupCode =
            deliveryMethod === "Pick up at store" ? generatePickupCode() : null;

        // Estimate completion date (7 days for custom builds)
        const estimatedCompletionDate = new Date();
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 7);

        // Create simplified build transaction
        const buildTransaction = new BuildTransaction({
            buildName: buildData.name,
            buildType: buildOptions.buildType || "custom",
            userId: customerInfo.userId,
            userName: customerInfo.name,
            userEmail: customerInfo.email,
            userAddress:
                addressInfo?.fullAddress ||
                addressInfo?.address ||
                customerInfo.address,
            warrantyPeriod: buildOptions.warrantyPeriod || 24,
            orderId: buildId,
            buildImage:
                buildData.image ||
                buildData.buildImage ||
                build.image ||
                (() => {
                    // Try to get image from case component
                    const caseComponent = selectedComponents?.find(
                        (comp) =>
                            comp.type === "casing" ||
                            comp.type === "Case" ||
                            comp.type?.toLowerCase() === "case"
                    );
                    return caseComponent?.image || caseComponent?.imgUrls?.[0]?.url || "";
                })(),
            buildStatus: "pending",
            buildImage:
                buildData.image ||
                buildData.buildImage ||
                build.image ||
                (() => {
                    // Try to get image from case component
                    const caseComponent = selectedComponents?.find(
                        (comp) =>
                            comp.type === "casing" ||
                            comp.type === "Case" ||
                            comp.type?.toLowerCase() === "case"
                    );
                    return caseComponent?.image || caseComponent?.imgUrls?.[0]?.url || "";
                })(),
            buildStatus: "Pending",
            published: false,
            components: selectedComponents.map((component) => ({
                componentId: component._id || component.componentId,
                quantity: component.quantity || 1,
            })),
            TotalPrice: componentsPrice,
            province: addressInfo?.province || customerInfo.province,
            district: addressInfo?.district || customerInfo.district,
            paymentMethod: "stripe",
            deliveryMethod: deliveryMethod,
            serviceCharge: serviceCharge,
            deliveryCharge: deliveryCharge,
            totalCharge: total,
            stepTimestamps: {
                Pending: new Date(),
                Successful: new Date(),
            },
        });

        await buildTransaction.save();

        // Update the original build with transaction reference
        await buildModel.findByIdAndUpdate(buildId, {
            orderId: buildTransaction._id,
            buildStatus: "confirmed",
        });

        // Prepare response data
        const responseData = {
            message: "Build transaction created successfully",
            transaction: {
                id: buildTransaction._id,
                buildName: buildTransaction.buildName,
                buildStatus: buildTransaction.buildStatus,
                totalCharge: buildTransaction.totalCharge,
                deliveryMethod: buildTransaction.deliveryMethod,
                ...(pickupCode && { pickupCode }),
            },
            nextSteps:
                deliveryMethod === "Pick up at store"
                    ? [
                        `Your pickup code is: ${pickupCode}`,
                        "We will notify you when your build is ready for pickup",
                    ]
                    : [
                        "We will start ordering components",
                        "You will receive updates as we progress with your build",
                    ],
        };

        res.status(201).json(responseData);
    } catch (error) {
        console.error("Build transaction error:", error);
        res.status(500).json({
            message: "Build transaction failed",
            error: error.message,
            details: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
};

// Get Build Transactions (only paid/completed transactions)
export const getBuildTransactions = async (req, res) => {
    try {
        const {
            search,
            query,
            date,
            buildId,
            page = 1,
            limit = 5,
            buildStatus,
        } = req.query;
        const searchQuery = search || query; // Support both search and query parameters
        const queryObj = {};

        // Add status filter if provided
        if (buildStatus && buildStatus !== "All") {
            queryObj.buildStatus = buildStatus;
        }

        // Add Build ID search
        if (buildId) {
            // Match the buildId at the end of the ObjectId string
            queryObj.$expr = {
                // Match the input(ObjectId) with the buildId
                $regexMatch: {
                    input: {
                        //Extract the last 4 characters from ObjectId
                        $substrCP: [
                            { $toString: "$_id" }, // Convert ObjectId to string
                            { $subtract: [{ $strLenCP: { $toString: "$_id" } }, 4] }, // Start from the 4th last character
                            4,
                        ],
                    },
                    // Match the buildId at the beginning of the string
                    regex: new RegExp(`^${buildId}`, "i"),
                },
            };
        }

        if (searchQuery) {
            queryObj.$or = [
                { userName: { $regex: searchQuery, $options: "i" } },
                { userEmail: { $regex: searchQuery, $options: "i" } },
                { buildName: { $regex: searchQuery, $options: "i" } },
            ];
        }

        // Add date filter
        if (date) {
            const startDate = new Date(date);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            queryObj.createdAt = {
                $gte: startDate,
                $lt: nextDay,
            };
        }

        // Get status counts
        const statusCounts = await BuildTransaction.aggregate([
            {
                $group: {
                    _id: "$buildStatus",
                    count: { $sum: 1 },
                },
            },
        ]);

        // Convert status counts to object
        const statusCountsObj = statusCounts.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        // Calculate skip value for pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get total count of Build Transactions
        const totalBuildTransactions = await BuildTransaction.countDocuments(
            queryObj
        );

        // Use aggregation pipeline to get builds with product and user details
        const builds = await BuildTransaction.aggregate([
            { $match: queryObj },
            { $sort: { updatedAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            { $unwind: { path: "$components", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "products",
                    let: {
                        componentId: {
                            $cond: {
                                if: { $type: "$components.componentId" },
                                then: { $toObjectId: "$components.componentId" },
                                else: "$components.componentId",
                            },
                        },
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$componentId"] },
                            },
                        },
                        {
                            $project: {
                                name: 1,
                                price: 1,
                                type: 1,
                                manufacturer: 1,
                                img_urls: 1,
                            },
                        },
                    ],
                    as: "productDetails",
                },
            },
            {
                $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true },
            },
            {
                $lookup: {
                    from: "users",
                    let: {
                        userId: {
                            $cond: {
                                if: { $type: "$userId" },
                                then: { $toObjectId: "$userId" },
                                else: "$userId",
                            },
                        },
                    },
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
                    components: {
                        $push: {
                            $cond: {
                                if: { $ne: ["$components.componentId", null] },
                                then: {
                                    _id: "$components.componentId",
                                    quantity: "$components.quantity",
                                    name: "$productDetails.name",
                                    type: "$productDetails.type",
                                    manufacturer: "$productDetails.manufacturer",
                                    price: "$productDetails.price",
                                    product_image: {
                                        $arrayElemAt: ["$productDetails.img_urls.url", 0],
                                    },
                                },
                                else: "$$REMOVE",
                            },
                        },
                    },
                    buildName: { $first: "$buildName" },
                    buildType: { $first: "$buildType" },
                    TotalPrice: { $first: "$TotalPrice" },
                    totalCharge: { $first: "$totalCharge" },
                    buildStatus: { $first: "$buildStatus" },
                    deliveryMethod: { $first: "$deliveryMethod" },
                    userId: { $first: "$userId" },
                    userName: { $first: "$userDetails.name" },
                    userEmail: { $first: "$userDetails.email" },
                    userAddress: { $first: "$userAddress" },
                    createdAt: { $first: "$createdAt" },
                    updatedAt: { $first: "$updatedAt" },
                    stepTimestamps: { $first: "$stepTimestamps" },
                    profilePicture: { $first: "$userDetails.profilePicture" },
                    userDetails: { $first: "$userDetails" },
                },
            },
            { $sort: { updatedAt: -1 } }, // Sort after grouping to ensure final results are sorted
        ]);

        res.status(200).json({
            Success: true,
            data: builds,
            pagination: {
                total: totalBuildTransactions,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalBuildTransactions / parseInt(limit)),
            },
            statusCounts: statusCountsObj,
        });
        console.log("Build transactions fetched successfully:", builds);
    } catch (error) {
        console.error("Error fetching build transactions:", error);
        console.error("Error stack:", error.stack);
        res
            .status(500)
            .json({ Success: false, message: `Server Error: ${error.message}` });
    }
};

export const getUserBuildTransactions = async (userId) => {
    try {
        if (!userId) throw new Error("User ID is required");

        const userBuilds = await BuildTransaction.find({ userId }).sort({
            createdAt: -1,
        });

        return userBuilds;
    } catch (error) {
        console.error("Error fetching user's build transactions:", error);
        throw error;
    }
};

//Get single order by Id with its component details
export const getSingleBuildOrder = async (req, res) => {
    try {
        const orderId = req.params.id;

        const orders = await BuildTransaction.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(orderId),
                },
            },
            {
                $unwind: "$components",
            },
            {
                $lookup: {
                    from: "products", // your product collection name
                    localField: "components.componentId",
                    foreignField: "_id",
                    as: "componentDetails",
                },
            },
            {
                $unwind: {
                    path: "$componentDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    "components.name": "$componentDetails.name",
                    "components.price": "$componentDetails.price",
                    "components.product_image": {
                        $arrayElemAt: ["$componentDetails.img_urls.url", 0],
                    },
                },
            },
            {
                $group: {
                    _id: "$_id",
                    buildName: { $first: "$buildName" },
                    buildStatus: { $first: "$buildStatus" },
                    userId: { $first: "$userId" },
                    userName: { $first: "$userName" },
                    userEmail: { $first: "$userEmail" },
                    userAddress: { $first: "$userAddress" },
                    buildImage: { $first: "$buildImage" },
                    totalCharge: { $first: "$totalCharge" },
                    paymentMethod: { $first: "$paymentMethod" },
                    createdAt: { $first: "$createdAt" },
                    stepTimestamps: { $first: "$stepTimestamps" },
                    components: {
                        $push: {
                            componentId: "$components.componentId",
                            quantity: "$components.quantity",
                            name: "$components.name",
                            price: "$components.price",
                            product_image: "$components.product_image",
                        },
                    },
                },
            },
        ]);

        if (!orders.length) {
            return res.status(404).json({ message: "Build transaction not found" });
        }

        res.status(200).json({ success: true, data: orders[0] });
    } catch (error) {
        console.error("Error fetching build order:", error);
        res.status(500).json({
            message: "Error fetching build transaction",
            error: error.message,
        });
    }
};

export const updateBuildTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { buildStatus, stepTimestamp } = req.body;

        const updateData = {};

        if (buildStatus) {
            updateData.buildStatus = buildStatus;
        }

        // Update timestamp for the new status
        if (stepTimestamp) {
            Object.entries(stepTimestamp).forEach(([key, value]) => {
                updateData[`stepTimestamps.${key}`] = value;
            });
        }

        const updatedTransaction = await BuildTransaction.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedTransaction) {
            return res.status(404).json({ message: "Build transaction not found" });
        }

        res.status(200).json({
            message: "Build transaction updated successfully",
            transaction: updatedTransaction,
        });
    } catch (error) {
        res.status(500).json({
            message: "Error updating build transaction",
            error: error.message,
        });
    }
};

// Checkout endpoint specifically for build transactions from cart flow
export const checkoutBuildTransaction = async (req, res) => {
    try {
        console.log(
            "Build Transaction Checkout Request Body:",
            JSON.stringify(req.body, null, 2)
        );

        const {
            items,
            total,
            paymentMethodId,
            customerEmail,
            customerName,
            customerAddress,
            customerNumber,
            user,
        } = req.body;

        // Validate request data
        if (
            !Array.isArray(items) ||
            items.length === 0 ||
            !total ||
            !paymentMethodId ||
            !customerEmail
        ) {
            return res.status(400).json({ message: "Invalid request data" });
        }

        // Find the custom build item
        const customBuildItem = items.find((item) => item.type === "custom_build");
        if (!customBuildItem) {
            return res
                .status(400)
                .json({ message: "No custom build found in cart items" });
        }

        console.log(
            "Custom build item found:",
            JSON.stringify(customBuildItem, null, 2)
        );

        // Extract and validate build data
        const buildData = customBuildItem.buildData;
        if (!buildData) {
            return res
                .status(400)
                .json({ message: "Invalid build data structure - buildData missing" });
        }

        console.log("Build data extracted:", JSON.stringify(buildData, null, 2));

        // Validate essential build data fields
        if (!buildData.buildId) {
            return res
                .status(400)
                .json({ message: "Invalid build data structure - buildId missing" });
        }

        if (
            !buildData.selectedComponents ||
            !Array.isArray(buildData.selectedComponents)
        ) {
            return res.status(400).json({
                message:
                    "Invalid build data structure - selectedComponents missing or not an array",
            });
        }

        if (buildData.selectedComponents.length === 0) {
            return res.status(400).json({
                message: "Invalid build data structure - selectedComponents is empty",
            });
        }

        // Process payment through Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: total * 100,
            currency: "usd",
            payment_method: paymentMethodId,
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        });

        if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({
                message: "Payment failed",
                paymentError: paymentIntent.last_payment_error?.message,
            });
        }

        // Fetch the build details - skip for temporary builds
        let build = null;
        let buildImage = "";

        // Check if this is a temporary build (created via "Continue Purchase" without saving)
        const isTemporaryBuild =
            buildData.buildId &&
            buildData.buildId.toString().startsWith("temp_build_");

        if (!isTemporaryBuild) {
            // Only try to fetch from database if it's not a temporary build
            build = await buildModel.findById(buildData.buildId);
            if (!build) {
                return res.status(404).json({ message: "Build not found" });
            }
            buildImage = build.image;
        }

        console.log("Checkout - Build info:", {
            isTemporaryBuild: isTemporaryBuild,
            "buildData.buildId": buildData.buildId,
            "build found": !!build,
            "buildData.image": buildData.image,
            "buildData.buildImage": buildData.buildImage,
            "build.image": buildImage,
            "customBuildItem.image": customBuildItem.image,
        });

        // Process components data
        const processedComponents = buildData.selectedComponents.map(
            (component) => ({
                componentId: component._id || component.componentId,
                name: component.name,
                type: component.type,
                manufacturer: component.manufacturer,
                price: component.price,
                quantity: component.quantity || 1,
                image:
                    component.image || (component.imgUrls && component.imgUrls[0]?.url),
                specifications: {
                    ...component.specifications,
                    description: component.description,
                    model: component.model,
                    features: component.features,
                },
            })
        );

        // Calculate components price from selected components
        const componentsPrice = buildData.selectedComponents.reduce(
            (total, component) => {
                return total + component.price * (component.quantity || 1);
            },
            0
        );

        // Extract pricing breakdown - use defaults if not provided
        const pricingBreakdown = buildData.pricingBreakdown || {};
        const serviceCharge =
            pricingBreakdown.serviceCharge ||
            calculateServiceCharge(buildData.selectedComponents.length);
        const deliveryCharge =
            buildData.deliveryMethod === "Home Delivery"
                ? pricingBreakdown.deliveryCharge || 0
                : 0;

        // Generate pickup code if store pickup is selected
        const pickupCode =
            buildData.deliveryMethod === "Pick up at store"
                ? generatePickupCode()
                : null;

        // Estimate completion date (7 days for custom builds)
        const estimatedCompletionDate = new Date();
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 7);

        // Create simplified build transaction
        const buildTransaction = new BuildTransaction({
            buildName: buildData.buildName || customBuildItem.name || "Custom Build",
            buildType: "custom",
            userId: user || "Guest User",
            userName: customerName,
            userEmail: customerEmail,
            userAddress: customerAddress,
            warrantyPeriod: 24,
            orderId: buildData.buildId,
            buildImage:
                buildData.image ||
                buildData.buildImage ||
                buildImage ||
                customBuildItem.image ||
                (() => {
                    // Try to get image from case component
                    const caseComponent = buildData.selectedComponents?.find(
                        (comp) =>
                            comp.type === "casing" ||
                            comp.type === "Case" ||
                            comp.type?.toLowerCase() === "case"
                    );
                    return caseComponent?.image || caseComponent?.imgUrls?.[0]?.url || "";
                })(),
            buildStatus: "pending",
            buildImage:
                buildData.image ||
                buildData.buildImage ||
                buildImage ||
                customBuildItem.image ||
                (() => {
                    // Try to get image from case component
                    const caseComponent = buildData.selectedComponents?.find(
                        (comp) =>
                            comp.type === "casing" ||
                            comp.type === "Case" ||
                            comp.type?.toLowerCase() === "case"
                    );
                    return caseComponent?.image || caseComponent?.imgUrls?.[0]?.url || "";
                })(),
            buildStatus: "Pending",
            published: false,
            components: buildData.selectedComponents.map((component) => ({
                componentId: component._id || component.componentId,
                quantity: component.quantity || 1,
            })),
            TotalPrice: componentsPrice,
            province: buildData.deliveryInfo?.province || "",
            district: buildData.deliveryInfo?.district || "",
            paymentMethod: "stripe",
            deliveryMethod: buildData.deliveryMethod || "Home Delivery",
            serviceCharge: serviceCharge,
            deliveryCharge: deliveryCharge,
            totalCharge: total,
            stepTimestamps: {
                Pending: new Date(),
                Successful: new Date(),
            },
        });

        await buildTransaction.save();

        // Update the original build with transaction reference (only for saved builds)
        if (!isTemporaryBuild) {
            await buildModel.findByIdAndUpdate(buildData.buildId, {
                orderId: buildTransaction._id,
                buildStatus: "confirmed",
            });
        }

        console.log(
            "Build transaction created successfully:",
            buildTransaction._id
        );

        return res.status(200).json({
            message: "Build Transaction Successful",
            transaction: {
                id: buildTransaction._id,
                buildName: buildTransaction.buildName,
                buildStatus: buildTransaction.buildStatus,
                totalCharge: buildTransaction.totalCharge,
            },
            pickupCode: pickupCode || null,
        });
    } catch (error) {
        console.error("Build Transaction checkout error:", error);

        if (error.type === "StripeCardError") {
            return res
                .status(400)
                .json({ message: "Card declined", error: error.message });
        }

        return res
            .status(500)
            .json({ message: "Build Transaction Failed", error: error.message });
    }
};

// API endpoint to calculate service charge based on component count
export const calculateServiceChargeAPI = async (req, res) => {
    try {
        const { componentCount } = req.query;

        if (!componentCount || isNaN(componentCount)) {
            return res.status(400).json({
                message: "Component count is required and must be a number",
            });
        }

        const count = parseInt(componentCount);
        const serviceCharge = calculateServiceCharge(count);

        res.status(200).json({
            componentCount: count,
            serviceCharge: serviceCharge,
            breakdown: {
                baseCharge: 1000,
                additionalParts: Math.max(0, count - 8),
                additionalCharges: Math.max(0, count - 8) * 100,
            },
        });
    } catch (error) {
        console.error("Error calculating service charge:", error);
        res.status(500).json({
            message: "Error calculating service charge",
            error: error.message,
        });
    }
};

// Delete build transaction by ID
export const deleteBuildTransaction = async (req, res) => {
    try {
        // Extract build transaction ID from request parameters
        const { id } = req.params;

        // Find and delete the build transaction by ID
        const existingBuildTransaction = await BuildTransaction.findByIdAndDelete(
            id
        );

        if (!existingBuildTransaction) {
            return res.status(404).json({
                success: false,
                message: "Build transaction not found",
            });
        }

        res.status(200).json({
            success: true,
            message: `Build order deleted successfully`,
        });
    } catch (error) {
        console.error("Error deleting build transaction:", error);
        return res.status(500).json({
            success: false,
            message: `Server Error: ${error.message}`,
        });
    }
};

// Get single build transaction by ID
export const getSingleBuildTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        // Use aggregation pipeline to get build with product and user details (same as getBuildTransactions but for single build)
        const builds = await BuildTransaction.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            { $unwind: { path: "$components", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "products",
                    let: {
                        componentId: {
                            $cond: {
                                if: { $type: "$components.componentId" },
                                then: { $toObjectId: "$components.componentId" },
                                else: "$components.componentId",
                            },
                        },
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$componentId"] },
                            },
                        },
                        {
                            $project: {
                                name: 1,
                                price: 1,
                                type: 1,
                                manufacturer: 1,
                                img_urls: 1,
                            },
                        },
                    ],
                    as: "productDetails",
                },
            },
            {
                $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true },
            },
            {
                $lookup: {
                    from: "users",
                    let: {
                        userId: {
                            $cond: {
                                if: { $type: "$userId" },
                                then: { $toObjectId: "$userId" },
                                else: "$userId",
                            },
                        },
                    },
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
                    components: {
                        $push: {
                            $cond: {
                                if: { $ne: ["$components.componentId", null] },
                                then: {
                                    _id: "$components.componentId",
                                    quantity: "$components.quantity",
                                    name: "$productDetails.name",
                                    type: "$productDetails.type",
                                    manufacturer: "$productDetails.manufacturer",
                                    price: "$productDetails.price",
                                    product_image: {
                                        $arrayElemAt: ["$productDetails.img_urls.url", 0],
                                    },
                                },
                                else: "$$REMOVE",
                            },
                        },
                    },
                    buildName: { $first: "$buildName" },
                    buildType: { $first: "$buildType" },
                    TotalPrice: { $first: "$TotalPrice" },
                    totalCharge: { $first: "$totalCharge" },
                    buildStatus: { $first: "$buildStatus" },
                    deliveryMethod: { $first: "$deliveryMethod" },
                    userId: { $first: "$userId" },
                    userName: { $first: "$userDetails.name" },
                    userEmail: { $first: "$userDetails.email" },
                    userAddress: { $first: "$userAddress" },
                    province: { $first: "$province" },
                    district: { $first: "$district" },
                    paymentMethod: { $first: "$paymentMethod" },
                    serviceCharge: { $first: "$serviceCharge" },
                    deliveryCharge: { $first: "$deliveryCharge" },
                    createdAt: { $first: "$createdAt" },
                    updatedAt: { $first: "$updatedAt" },
                    stepTimestamps: { $first: "$stepTimestamps" },
                    profilePicture: { $first: "$userDetails.profilePicture" },
                    userDetails: { $first: "$userDetails" },
                    warrantyPeriod: { $first: "$warrantyPeriod" },
                    orderId: { $first: "$orderId" },
                    buildImage: { $first: "$buildImage" },
                    published: { $first: "$published" },
                },
            },
        ]);

        if (!builds || builds.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Build transaction not found",
            });
        }

        const build = builds[0];

        res.status(200).json({
            success: true,
            data: build,
        });
    } catch (error) {
        console.error("Error fetching build transaction:", error);
        return res.status(500).json({
            success: false,
            message: `Server Error: ${error.message}`,
        });
    }
};

// Get top builds for dashboard (delivered builds ordered by highest totalCharge)
export const getTopBuilds = async (req, res) => {
    try {
        const { limit = 5 } = req.query;

        const topBuilds = await BuildTransaction.aggregate([
            // Match only delivered builds
            {
                $match: {
                    buildStatus: "Delivered",
                },
            },
            // Lookup user data
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                },
            },
            {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: true,
                },
            },
            // Sort by totalCharge descending (highest first)
            {
                $sort: {
                    totalCharge: -1,
                },
            },
            // Limit results
            {
                $limit: parseInt(limit),
            },
            // Project required fields
            {
                $project: {
                    _id: 1,
                    buildName: 1,
                    buildImage: 1,
                    totalCharge: 1,
                    deliveredDate: "$stepTimestamps.Delivered",
                    createdAt: 1,
                    userName: "$user.name",
                    userEmail: "$user.email",
                },
            },
        ]);

        res.status(200).json({
            success: true,
            data: topBuilds,
        });
    } catch (error) {
        console.error("Error fetching top builds:", error);
        return res.status(500).json({
            success: false,
            message: `Server Error: ${error.message}`,
        });
    }
};

// Get build summary totals for dashboard
export const getBuildSummaryTotals = async (req, res) => {
    try {
        const { filter = 'All' } = req.query;

        // Date range logic (same as order summary)
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

        // Total Build Orders (excluding cancelled)
        const totalBuildOrders = await BuildTransaction.countDocuments({
            buildStatus: { $nin: ['Canceled'] },
            ...dateFilter
        });

        // Pending Build Orders
        const pendingBuildOrders = await BuildTransaction.countDocuments({
            buildStatus: 'Pending',
            ...dateFilter
        });

        // Total Build Revenue (Delivered builds)
        const totalBuildRevenueAgg = await BuildTransaction.aggregate([
            { $match: { buildStatus: { $in: ['Delivered'] }, ...dateFilter } },
            { $group: { _id: null, total: { $sum: "$totalCharge" } } }
        ]);
        const totalBuildRevenue = totalBuildRevenueAgg[0]?.total || 0;

        res.status(200).json({
            totalBuildOrders,
            pendingBuildOrders,
            totalBuildRevenue
        });
    } catch (err) {
        console.error("Error fetching build summary:", err);
        res.status(500).json({
            message: "Failed to fetch build summary",
            error: err.message
        });
    }
};

// Get build summary for dashboard (pending builds)
export const getBuildSummary = async (req, res) => {
    try {
        console.log('getBuildSummary called with query:', req.query);
        const { page = 1, limit = 5 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get total count of pending builds
        const totalBuilds = await BuildTransaction.countDocuments({ buildStatus: "Pending" });
        console.log('Total pending builds:', totalBuilds);

        // Use aggregation pipeline to get pending builds with user details
        const builds = await BuildTransaction.aggregate([
            { $match: { buildStatus: "Pending" } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            // Add lookup for user details
            {
                $lookup: {
                    from: "users",
                    let: { userId: { $toObjectId: "$userId" } },
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
                    buildName: 1,
                    buildStatus: 1,
                    totalCharge: 1,
                    userId: 1,
                    userName: "$userDetails.name",
                    userEmail: "$userDetails.email",
                    userAddress: 1,
                    createdAt: 1,
                    profilePicture: "$userDetails.profilePicture",
                    userDetails: "$userDetails"
                }
            }
        ]);

        console.log('Found builds:', builds.length);

        res.status(200).json({
            Success: true,
            data: builds,
            pagination: {
                total: totalBuilds,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalBuilds / parseInt(limit))
            }
        });
    } catch (err) {
        console.error("Error in getBuildSummary:", err);
        res.status(500).json({
            Success: false,
            message: "Failed to fetch builds",
            error: err.message
        });
    }
};
