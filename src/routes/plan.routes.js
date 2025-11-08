// src/routes/plan.routes.js
const express = require('express');
const router = express.Router();
const { 
  createPlan, 
  getAllPlans, 
  getPlanByName, // Import new function
  updatePlan     // Import new function
} = require('../controllers/plan.controller.js');
const { protect, adminProtect } = require('../middleware/auth.middleware.js'); // Import middleware

// --- Public Route ---
// This will now handle GET /api/plans/getAllPlans
router.get('/getAllPlans', getAllPlans);

// --- Admin-Only Routes ---

// This will now handle POST /api/plans/createPlan
// Use protect (is logged in) and adminProtect (is admin)
router.post('/createPlan', protect, adminProtect, createPlan);

// NEW: GET /api/plans/by-name/:planName
// Gets a single plan's details for the edit form
router.get('/by-name/:planName', protect, adminProtect, getPlanByName);

// NEW: PUT /api/plans/update/:planId
// Submits the updated plan data
router.put('/update/:planId', protect, adminProtect, updatePlan);

module.exports = router;