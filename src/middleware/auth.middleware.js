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
// This middleware checks if the user is an admin
// It must be used *after* the 'protect' middleware
const adminProtect = (req, res, next) => {
  // Check the role from the user object attached by 'protect'
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized. Admin access only.' });
  }
};

module.exports = { protect, adminProtect };