const express = require('express');
const router = express.Router();
const { 
  signup, 
  login, 
  googleLogin, 
  verifyOtp, 
  forgotPassword, 
  resetPassword 
} = require('../controllers/auth.controller');

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
