import mongoose from 'mongoose';

// Middleware to validate MongoDB ObjectId in route params
export function validateObjectId(req, res, next) {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ Success: false, message: 'Invalid ID format' });
    }
    next();
}
