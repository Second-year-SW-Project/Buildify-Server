import jwt from 'jsonwebtoken';
import User from '../model/userModel.js';


const authenticateJWT = async (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    // Secret key to verify the token
    req.user = await User.findById(decoded.id); 
    // Attach user info to the request object
    next();
     // Proceed to the next middleware or route handler
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

export default authenticateJWT;
