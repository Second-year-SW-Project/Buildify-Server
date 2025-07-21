// routes/buildTransactionRoutes.js
import express from "express";
import {
    createBuildTransaction,
    getBuildTransactions,
    updateBuildTransactionStatus,
    checkoutBuildTransaction,
    getSingleBuildOrder,
    calculateServiceChargeAPI,
    deleteBuildTransaction,
    getUserBuildTransactions,
    getSingleBuildTransaction,
    getTopBuilds,
    getBuildSummaryTotals,
    getBuildSummary,
} from "../controller/buildTransactionController.js";
import { protect } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const buildTransactionRouter = express.Router();

// Create build transaction (main endpoint for continue purchase page)
buildTransactionRouter.post("/create", protect, createBuildTransaction);

// Checkout endpoint for build transactions from cart flow
buildTransactionRouter.post("/checkout", checkoutBuildTransaction);

// Get build transactions with filtering
buildTransactionRouter.get("/", protect, getBuildTransactions);

// Get build summary totals for dashboard
buildTransactionRouter.get("/build-summary-total", protect, isAdmin, getBuildSummaryTotals);

// Get build summary for dashboard (pending builds)
buildTransactionRouter.get("/build-summary", protect, isAdmin, getBuildSummary);

// Get top builds for dashboard
buildTransactionRouter.get("/top-builds", protect, isAdmin, getTopBuilds);

buildTransactionRouter.get("/user-builds/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const builds = await getUserBuildTransactions(userId);
        res.status(200).json({ success: true, data: builds });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Calculate service charge based on component count (must be before /:id route)
buildTransactionRouter.get(
    "/calculate-service-charge",
    calculateServiceChargeAPI
);

// Get a specific build transaction by ID
buildTransactionRouter.get("/:id", protect, getSingleBuildOrder);

buildTransactionRouter.get(
    "/builds/:id",
    protect,
    validateObjectId,
    getSingleBuildTransaction
);

// Delete build transaction by ID
buildTransactionRouter.delete(
    "/:id",
    protect,
    validateObjectId,
    deleteBuildTransaction
);

// Update build transaction status
buildTransactionRouter.patch(
    "/:id/status",
    protect,
    validateObjectId,
    updateBuildTransactionStatus
);

// Test endpoint to validate data structure for continue purchase page
buildTransactionRouter.post("/validate-data", (req, res) => {
    try {
        const requiredFields = {
            buildId: req.body.buildId ? "✓" : "✗ Missing",
            buildData: req.body.buildData ? "✓" : "✗ Missing",
            selectedComponents: req.body.selectedComponents
                ? `✓ (${req.body.selectedComponents.length} components)`
                : "✗ Missing",
            customerInfo: req.body.customerInfo ? "✓" : "✗ Missing",
            addressInfo: req.body.addressInfo ? "✓" : "✗ Missing",
            deliveryMethod: req.body.deliveryMethod
                ? `✓ (${req.body.deliveryMethod})`
                : "✗ Missing",
            deliveryInfo: req.body.deliveryInfo ? "✓" : "✗ Missing",
            pricingBreakdown: req.body.pricingBreakdown ? "✓" : "✗ Missing",
            buildOptions: req.body.buildOptions ? "✓" : "✗ Missing",
            paymentMethodId: req.body.paymentMethodId ? "✓" : "✗ Missing",
        };

        const detailedCheck = {
            customerInfo: req.body.customerInfo
                ? {
                    userId: req.body.customerInfo.userId ? "✓" : "✗ Missing",
                    name: req.body.customerInfo.name ? "✓" : "✗ Missing",
                    email: req.body.customerInfo.email ? "✓" : "✗ Missing",
                    phone:
                        req.body.customerInfo.phone || req.body.customerInfo.number
                            ? "✓"
                            : "✗ Missing",
                }
                : "Not provided",

            addressInfo: req.body.addressInfo
                ? {
                    fullAddress:
                        req.body.addressInfo.fullAddress || req.body.addressInfo.address
                            ? "✓"
                            : "✗ Missing",
                    province: req.body.addressInfo.province ? "✓" : "✗ Missing",
                    district: req.body.addressInfo.district ? "✓" : "✗ Missing",
                }
                : "Not provided",

            pricingBreakdown: req.body.pricingBreakdown
                ? {
                    componentsPrice:
                        req.body.pricingBreakdown.componentsPrice ||
                            req.body.pricingBreakdown.componentCost
                            ? "✓"
                            : "✗ Missing",
                    serviceCharge:
                        req.body.pricingBreakdown.serviceCharge !== undefined
                            ? "✓"
                            : "✗ Missing",
                    deliveryCharge:
                        req.body.pricingBreakdown.deliveryCharge !== undefined
                            ? "✓"
                            : "✗ Missing",
                }
                : "Not provided",
        };

        res.status(200).json({
            message: "Data validation complete",
            requiredFields,
            detailedCheck,
            recommendation:
                "All ✓ fields are properly formatted. Fix ✗ fields before proceeding.",
        });
    } catch (error) {
        res.status(500).json({
            message: "Validation error",
            error: error.message,
        });
    }
});

export default buildTransactionRouter;
