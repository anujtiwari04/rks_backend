// rks-backend/src/routes/chat.routes.js
const express = require('express');
const router = express.Router();
const { 
  createMessage, 
  deleteMessage, 
  editMessage, // Import new function
  getMessagesForPlan 
} = require('../controllers/chat.controller.js');
const { protect, adminProtect } = require('../middleware/auth.middleware.js');

// --- Admin Routes ---
router.post('/create', protect, adminProtect, createMessage);
router.put('/edit/:messageId', protect, adminProtect, editMessage); // --- NEW ---
router.delete('/delete/:messageId', protect, adminProtect, deleteMessage); // --- UPDATED (now soft delete) ---

// --- User/Admin Route ---
router.get('/get/:planName', protect, getMessagesForPlan); // --- UPDATED Route Path ---

module.exports = router;