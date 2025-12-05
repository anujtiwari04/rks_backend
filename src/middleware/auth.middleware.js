// rks-backend/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); 

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token ID and attach to request object
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// --- NEW ADMIN MIDDLEWARE ---
const adminProtect = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized. Admin access only.' });
  }
};

// --- NEW OPTIONAL AUTH MIDDLEWARE ---
// Used for "Freemium" routes. 
// If token exists & is valid -> sets req.user.
// If no token or invalid -> sets req.user = null, but DOES NOT block the request.
const optionalProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Token exists but is invalid/expired. 
      // We explicitly treat this as "Guest" rather than erroring out, 
      // ensuring the user can still see the Teaser content.
      console.warn("Optional auth token failed, treating as guest:", error.message);
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
};

module.exports = { protect, adminProtect, optionalProtect };