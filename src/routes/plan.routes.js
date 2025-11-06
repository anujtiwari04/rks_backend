// src/routes/plan.routes.js
const express = require('express');
const router = express.Router();
const { createPlan, getAllPlans } = require('../controllers/plan.controller.js');

// This will now handle POST /api/plans/createPlan
router.post('/createPlan', createPlan);

// This will now handle GET /api/plans/getAllPlans
router.get('/getAllPlans', getAllPlans);

module.exports = router;