// controller/buildTransactionController.js
import mongoose from 'mongoose';
import { BuildTransaction } from '../model/BuildTransactionModel.js';
import buildModel from '../model/buildModel.js';
import { Transaction } from '../model/TransactionModel.js'; // Import for type differentiation
import Stripe from 'stripe';
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
        return 1000 + (additionalParts * 100); // Rs. 100 for each additional part
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
            buildOptions = {}
        } = req.body;
        
        console.log('Received build transaction data:', {
            buildId,
            buildData: buildData ? 'Present' : 'Missing',
            selectedComponents: selectedComponents ? `${selectedComponents.length} components` : 'Missing',
            customerInfo: customerInfo ? 'Present' : 'Missing',
            addressInfo: addressInfo ? 'Present' : 'Missing',
            deliveryMethod,
            deliveryInfo: deliveryInfo ? 'Present' : 'Missing',
            pricingBreakdown: pricingBreakdown ? 'Present' : 'Missing'
        });
        
        // Validate required data
        if (!buildId || !buildData || !selectedComponents || !customerInfo || !pricingBreakdown) {
            return res.status(400).json({ 
                message: "Missing required build transaction data",
                required: ['buildId', 'buildData', 'selectedComponents', 'customerInfo', 'pricingBreakdown']
            });
        }
        
        // Fetch the build details
        const build = await buildModel.findById(buildId);
        if (!build) {
            return res.status(404).json({ message: "Build not found" });
        }

        console.log('Build image sources:', {
            'buildData.image': buildData.image,
            'buildData.buildImage': buildData.buildImage,
            'build.image': build.image,
            'buildData keys': Object.keys(buildData)
        });
        
        // Process components data from continue purchase page
        const processedComponents = selectedComponents.map(component => ({
            componentId: component._id || component.componentId,
            name: component.name,
            type: component.type,
            manufacturer: component.manufacturer,
            price: component.price,
            quantity: component.quantity || 1,
            image: component.image || (component.img_urls && component.img_urls[0]?.url),
            specifications: {
                // Store any additional component specifications
                ...component.specifications,
                description: component.description,
                model: component.model,
                features: component.features
            }
        }));
        
        // Calculate comprehensive pricing
        const componentsPrice = pricingBreakdown.componentsPrice || pricingBreakdown.componentCost;
        const serviceCharge = pricingBreakdown.serviceCharge || calculateServiceCharge(selectedComponents.length);
        const deliveryCharge = deliveryMethod === 'Home Delivery' ? (pricingBreakdown.deliveryCharge || 0) : 0;
        const assemblyCharge = buildOptions.assemblyRequired ? (pricingBreakdown.assemblyCharge || 150) : 0;
        const qualityTestingCharge = buildOptions.qualityTesting ? (pricingBreakdown.qualityTestingCharge || 50) : 0;
        const total = componentsPrice + serviceCharge + deliveryCharge + assemblyCharge + qualityTestingCharge;
        
        console.log('Calculated pricing:', {
            componentsPrice,
            serviceCharge,
            deliveryCharge,
            assemblyCharge,
            qualityTestingCharge,
            total
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
                paymentError: paymentIntent.last_payment_error?.message 
            });
        }
        
        // Generate pickup code if store pickup is selected
        const pickupCode = deliveryMethod === 'Pick up at store' ? generatePickupCode() : null;
        
        // Estimate completion date (7 days for custom builds)
        const estimatedCompletionDate = new Date();
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 7);
        
        // Create simplified build transaction
        const buildTransaction = new BuildTransaction({
            buildName: buildData.name,
            buildType: buildOptions.buildType || 'custom',
            userId: customerInfo.userId,
            userName: customerInfo.name,
            userEmail: customerInfo.email,
            userAddress: addressInfo?.fullAddress || addressInfo?.address || customerInfo.address,
            warrantyPeriod: buildOptions.warrantyPeriod || 24,
            orderId: buildId,
            buildImage: buildData.image || buildData.buildImage || build.image || 
                        (() => {
                            // Try to get image from case component
                            const caseComponent = selectedComponents?.find(comp => 
                                comp.type === 'casing' || comp.type === 'Case' || comp.type?.toLowerCase() === 'case'
                            );
                            return caseComponent?.image || caseComponent?.imgUrls?.[0]?.url || "";
                        })(),
            buildStatus: "pending",
            published: false,
            components: selectedComponents.map(component => ({
                componentId: component._id || component.componentId,
                quantity: component.quantity || 1
            })),
            TotalPrice: componentsPrice,
            province: addressInfo?.province || customerInfo.province,
            district: addressInfo?.district || customerInfo.district,
            paymentMethod: 'stripe',
            deliveryMethod: deliveryMethod,
            serviceCharge: serviceCharge,
            deliveryCharge: deliveryCharge,
            totalCharge: total,
            stepTimestamps: {
                Pending: new Date(),
                Successful: new Date()
            }
        });
        
        await buildTransaction.save();
        
        // Update the original build with transaction reference
        await buildModel.findByIdAndUpdate(buildId, { 
            orderId: buildTransaction._id,
            buildStatus: 'confirmed'
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
                ...(pickupCode && { pickupCode })
            },
            nextSteps: deliveryMethod === 'Pick up at store' 
                ? [`Your pickup code is: ${pickupCode}`, 'We will notify you when your build is ready for pickup']
                : ['We will start ordering components', 'You will receive updates as we progress with your build']
        };
        
        res.status(201).json(responseData);
        
    } catch (error) {
        console.error('Build transaction error:', error);
        res.status(500).json({ 
            message: "Build transaction failed", 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};



// Get Build Transactions (separate from regular transactions)
export const getBuildTransactions = async (req, res) => {
    try {
        const { userId, buildStatus, page = 1, limit = 10 } = req.query;
        
        const queryObj = {};
        if (userId) queryObj.userId = userId;
        if (buildStatus) queryObj.buildStatus = buildStatus;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const buildTransactions = await BuildTransaction.find(queryObj)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const totalCount = await BuildTransaction.countDocuments(queryObj);
        
        res.status(200).json({
            success: true,
            data: buildTransactions,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / parseInt(limit))
            }
        });
        
    } catch (error) {
        res.status(500).json({ message: "Error fetching build transactions", error: error.message });
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
// export const getSingleBuildOrder =async (req, res) => {
//     try {
//             const { BuildTransaction } = await import('../model/BuildTransactionModel.js');
//             const transaction = await BuildTransaction.findById(req.params.id);
            
//             if (!transaction) {
//                 return res.status(404).json({ message: "Build transaction not found" });
//             }
            
//             res.status(200).json({ success: true, data: transaction });
//         } catch (error) {
//             res.status(500).json({ message: "Error fetching build transaction", error: error.message });
//         }
// };

// Update Build Transaction Status
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
            transaction: updatedTransaction 
        });
        
    } catch (error) {
        res.status(500).json({ message: "Error updating build transaction", error: error.message });
    }
};

// Checkout endpoint specifically for build transactions from cart flow
export const checkoutBuildTransaction = async (req, res) => {
    try {
        console.log("Build Transaction Checkout Request Body:", JSON.stringify(req.body, null, 2));

        const { 
            items, 
            total, 
            paymentMethodId, 
            customerEmail, 
            customerName, 
            customerAddress, 
            customerNumber, 
            user 
        } = req.body;

        // Validate request data
        if (!Array.isArray(items) || items.length === 0 || !total || !paymentMethodId || !customerEmail) {
            return res.status(400).json({ message: "Invalid request data" });
        }

        // Find the custom build item
        const customBuildItem = items.find(item => item.type === 'custom_build');
        if (!customBuildItem) {
            return res.status(400).json({ message: "No custom build found in cart items" });
        }

        console.log("Custom build item found:", JSON.stringify(customBuildItem, null, 2));

        // Extract and validate build data
        const buildData = customBuildItem.buildData;
        if (!buildData) {
            return res.status(400).json({ message: "Invalid build data structure - buildData missing" });
        }

        console.log("Build data extracted:", JSON.stringify(buildData, null, 2));

        // Validate essential build data fields
        if (!buildData.buildId) {
            return res.status(400).json({ message: "Invalid build data structure - buildId missing" });
        }

        if (!buildData.selectedComponents || !Array.isArray(buildData.selectedComponents)) {
            return res.status(400).json({ message: "Invalid build data structure - selectedComponents missing or not an array" });
        }

        if (buildData.selectedComponents.length === 0) {
            return res.status(400).json({ message: "Invalid build data structure - selectedComponents is empty" });
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
                paymentError: paymentIntent.last_payment_error?.message 
            });
        }

        // Fetch the build details - skip for temporary builds
        let build = null;
        let buildImage = "";
        
        // Check if this is a temporary build (created via "Continue Purchase" without saving)
        const isTemporaryBuild = buildData.buildId && buildData.buildId.toString().startsWith('temp_build_');
        
        if (!isTemporaryBuild) {
            // Only try to fetch from database if it's not a temporary build
            build = await buildModel.findById(buildData.buildId);
            if (!build) {
                return res.status(404).json({ message: "Build not found" });
            }
            buildImage = build.image;
        }

        console.log('Checkout - Build info:', {
            'isTemporaryBuild': isTemporaryBuild,
            'buildData.buildId': buildData.buildId,
            'build found': !!build,
            'buildData.image': buildData.image,
            'buildData.buildImage': buildData.buildImage,
            'build.image': buildImage,
            'customBuildItem.image': customBuildItem.image
        });

        // Process components data
        const processedComponents = buildData.selectedComponents.map(component => ({
            componentId: component._id || component.componentId,
            name: component.name,
            type: component.type,
            manufacturer: component.manufacturer,
            price: component.price,
            quantity: component.quantity || 1,
            image: component.image || (component.imgUrls && component.imgUrls[0]?.url),
            specifications: {
                ...component.specifications,
                description: component.description,
                model: component.model,
                features: component.features
            }
        }));

        // Calculate components price from selected components
        const componentsPrice = buildData.selectedComponents.reduce((total, component) => {
            return total + (component.price * (component.quantity || 1));
        }, 0);
        
        // Extract pricing breakdown - use defaults if not provided
        const pricingBreakdown = buildData.pricingBreakdown || {};
        const serviceCharge = pricingBreakdown.serviceCharge || calculateServiceCharge(buildData.selectedComponents.length);
        const deliveryCharge = buildData.deliveryMethod === 'Home Delivery' ? (pricingBreakdown.deliveryCharge || 0) : 0;

        // Generate pickup code if store pickup is selected
        const pickupCode = buildData.deliveryMethod === 'Pick up at store' ? generatePickupCode() : null;

        // Estimate completion date (7 days for custom builds)
        const estimatedCompletionDate = new Date();
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 7);

        // Create simplified build transaction
        const buildTransaction = new BuildTransaction({
            buildName: buildData.buildName || customBuildItem.name || "Custom Build",
            buildType: 'custom',
            userId: user || "Guest User",
            userName: customerName,
            userEmail: customerEmail,
            userAddress: customerAddress,
            warrantyPeriod: 24,
            orderId: buildData.buildId,
            buildImage: buildData.image || buildData.buildImage || buildImage || 
                        customBuildItem.image ||
                        (() => {
                            // Try to get image from case component
                            const caseComponent = buildData.selectedComponents?.find(comp => 
                                comp.type === 'casing' || comp.type === 'Case' || comp.type?.toLowerCase() === 'case'
                            );
                            return caseComponent?.image || caseComponent?.imgUrls?.[0]?.url || "";
                        })(),
            buildStatus: "pending",
            published: false,
            components: buildData.selectedComponents.map(component => ({
                componentId: component._id || component.componentId,
                quantity: component.quantity || 1
            })),
            TotalPrice: componentsPrice,
            province: buildData.deliveryInfo?.province || '',
            district: buildData.deliveryInfo?.district || '',
            paymentMethod: 'stripe',
            deliveryMethod: buildData.deliveryMethod || 'Home Delivery',
            serviceCharge: serviceCharge,
            deliveryCharge: deliveryCharge,
            totalCharge: total,
            stepTimestamps: {
                Pending: new Date(),
                Successful: new Date()
            }
        });

        await buildTransaction.save();

        // Update the original build with transaction reference (only for saved builds)
        if (!isTemporaryBuild) {
            await buildModel.findByIdAndUpdate(buildData.buildId, { 
                orderId: buildTransaction._id,
                buildStatus: 'confirmed'
            });
        }

        console.log('Build transaction created successfully:', buildTransaction._id);

        return res.status(200).json({ 
            message: "Build Transaction Successful", 
            transaction: {
                id: buildTransaction._id,
                buildName: buildTransaction.buildName,
                buildStatus: buildTransaction.buildStatus,
                totalCharge: buildTransaction.totalCharge
            },
            pickupCode: pickupCode || null
        });

    } catch (error) {
        console.error("Build Transaction checkout error:", error);

        if (error.type === "StripeCardError") {
            return res.status(400).json({ message: "Card declined", error: error.message });
        }

        return res.status(500).json({ message: "Build Transaction Failed", error: error.message });
    }
};

// API endpoint to calculate service charge based on component count
export const calculateServiceChargeAPI = async (req, res) => {
    try {
        const { componentCount } = req.query;
        
        if (!componentCount || isNaN(componentCount)) {
            return res.status(400).json({ 
                message: "Component count is required and must be a number" 
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
                additionalCharges: Math.max(0, count - 8) * 100
            }
        });
        
    } catch (error) {
        console.error('Error calculating service charge:', error);
        res.status(500).json({ 
            message: "Error calculating service charge", 
            error: error.message 
        });
    }
};