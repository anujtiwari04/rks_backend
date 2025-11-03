// src/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../controllers/payment.controller.js');

// Define the routes
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

module.exports = router;