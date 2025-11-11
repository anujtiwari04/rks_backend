const express = require('express');
const router = express.Router();
const { signup, login, googleLogin, verifyOtp} = require('../controllers/auth.controller');

router.post('/signup', signup);
router.post('/login', login);

router.post('/google', googleLogin);
router.post('/verify-otp', verifyOtp);

module.exports = router;
