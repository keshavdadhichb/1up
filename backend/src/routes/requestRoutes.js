// src/routes/requestsRoutes.js
const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');

// Borrower: Create a rental request
router.post('/', protect, requestController.createRentalRequest);

// Lender: Get all incoming requests for my items
router.get('/incoming', protect, requestController.getIncomingRequests); // <-- ADD THIS LINE

// Lender: Respond to a specific request (accept/reject)
router.put('/:requestId/respond', protect, requestController.respondToRequest); // <-- ADD THIS LINE

module.exports = router;