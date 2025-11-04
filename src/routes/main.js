// src/routes/main.js
const express = require('express');
const router = express.Router();

const paymentRoutes = require('./payment.routes.js');
const authRoutes = require('./auth.routes.js'); 

router.use('/payment', paymentRoutes);
router.use('/auth', authRoutes); 

module.exports = router;