// src/routes/plan.routes.js
const express = require('express');
const router = express.Router();
const { 
  createPlan, 
  getAllPlans, 
  getPlanByName, 
  updatePlan,
  deletePlan     // Import new function
} = require('../controllers/plan.controller.js');
const { protect, adminProtect } = require('../middleware/auth.middleware.js'); // Import middleware

// --- Public Route ---
// This will now handle GET /api/plans/getAllPlans
router.get('/getAllPlans', getAllPlans);

// --- Admin-Only Routes ---

// This will now handle POST /api/plans/createPlan
router.post('/createPlan', protect, adminProtect, createPlan);

// GET /api/plans/by-name/:planName
router.get('/by-name/:planName', protect, adminProtect, getPlanByName);

// PUT /api/plans/update/:planId
router.put('/update/:planId', protect, adminProtect, updatePlan);

// --- NEW: DELETE /api/plans/delete/:planId ---
router.delete('/delete/:planId', protect, adminProtect, deletePlan);

module.exports = router;