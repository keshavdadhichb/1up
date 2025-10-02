// src/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// All profile routes are protected
router.use(protect);

// GET /api/profile/listings - Get all listings created by the logged-in user
router.get('/listings', profileController.getMyListings);

// GET /api/profile/requests - Get all rental requests made by the logged-in user
router.get('/requests', profileController.getOutgoingRequests);

module.exports = router;