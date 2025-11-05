// src/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../controllers/payment.controller.js');
const { protect } = require('../middleware/auth.middleware.js'); 


router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);

module.exports = router;