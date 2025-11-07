// rks-backend/src/routes/chat.routes.js
const express = require('express');
const router = express.Router();
const { createMessage, deleteMessage, getMessagesForPlan } = require('../controllers/chat.controller.js');
const { protect, adminProtect } = require('../middleware/auth.middleware.js');

// --- Admin Routes ---
// protect = user is logged in
// adminProtect = user is an admin
router.post('/create', protect, adminProtect, createMessage);
router.delete('/:messageId', protect, adminProtect, deleteMessage);

// --- User Route ---
router.get('/:planName', protect, getMessagesForPlan);

module.exports = router;