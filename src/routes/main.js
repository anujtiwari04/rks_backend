// src/routes/main.js
const express = require('express');
const router = express.Router();

const paymentRoutes = require('./payment.routes.js');
const authRoutes = require('./auth.routes.js'); 
const planRoutes = require('./plan.routes.js');
const chatRoutes = require('./chat.routes.js');
const adminRoutes = require('./admin.routes.js'); 

const { getMyMemberships } = require('../controllers/membership.controller.js');
const { protect } = require('../middleware/auth.middleware.js');

router.use('/payment', paymentRoutes);
router.use('/auth', authRoutes); 
router.use('/plans', planRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes); 

router.get('/memberships', protect, getMyMemberships);

module.exports = router;