// Role-based middleware for API routes
export const isAdmin = (req, res, next) => {
    if (req.user && req.user.Role === 'admin') {
        return next();
    }
    return res.status(403).json({ Success: false, message: 'Admin access required' });
};

export const isUser = (req, res, next) => {
    if (req.user && req.user.Role === 'user') {
        return next();
    }
    return res.status(403).json({ Success: false, message: 'User access required' });
};
