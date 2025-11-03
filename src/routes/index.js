// src/routes/index.js
const express = require('express');
const router = express.Router();

const paymentRoutes = require('./payment.routes.js');
// const authRoutes = require('./auth.routes.js'); // <-- For the future

router.use('/payment', paymentRoutes);
// router.use('/auth', authRoutes); // <-- For the future

module.exports = router;