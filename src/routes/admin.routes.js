// rks_backend/src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { protect, adminProtect } = require('../middleware/auth.middleware.js');
const { getAllUserMemberships } = require('../controllers/admin.controller.js');

// This creates the GET /api/admin/all-memberships route
router.get('/all-memberships', protect, adminProtect, getAllUserMemberships);

module.exports = router;