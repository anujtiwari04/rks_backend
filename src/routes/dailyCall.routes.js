const express = require('express');
const router = express.Router();
const { 
  createCall, 
  getCallsForAdmin, 
  updateCall, 
  deleteCall, 
  getCallsForUser 
} = require('../controllers/dailyCall.controller.js');

const { protect, adminProtect, optionalProtect } = require('../middleware/auth.middleware.js');

// ==========================================
// ADMIN ROUTES (Protected + Admin Role)
// ==========================================

// Create a new call
router.post('/', protect, adminProtect, createCall);

// Get ALL calls (for admin dashboard table)
router.get('/admin/all', protect, adminProtect, getCallsForAdmin);

// Update a call (edit typo, close trade)
router.put('/:id', protect, adminProtect, updateCall);

// Soft delete a call
router.delete('/:id', protect, adminProtect, deleteCall);


// ==========================================
// USER ROUTES (Public / Optional Auth)
// ==========================================

// Get calls for the frontend feed
// Uses 'optionalProtect' to decide if we show Teaser or Full Data
router.get('/', optionalProtect, getCallsForUser);

module.exports = router;