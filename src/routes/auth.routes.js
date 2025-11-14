const express = require('express');
const router = express.Router();
const { 
  signup, 
  login, 
  googleLogin, 
  verifyOtp, 
  forgotPassword, 
  resetPassword,
  getMe
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware.js');

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
