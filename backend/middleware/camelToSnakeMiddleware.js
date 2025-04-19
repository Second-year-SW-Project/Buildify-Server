// middleware/camelToSnakeMiddleware.js
export const camelToSnakeMiddleware = (req, res, next) => {
    if (req.body.product) {
        try {
            req.body.product = JSON.parse(req.body.product);
            req.body.product = toSnakeCase(req.body.product);
            req.body.product = JSON.stringify(req.body.product); // Convert back to string for FormData compatibility
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid JSON format in request body" });
        }
    }
    next();
};

// Utility function to convert keys from camelCase to snake_case
export const toSnakeCase = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
            key.replace(/([A-Z])/g, "_$1").toLowerCase(), // Convert camelCase to snake_case
            toSnakeCase(value),
        ])
    );
};

export const toCamelCase = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
            key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
            toCamelCase(value),
        ])
    );
};