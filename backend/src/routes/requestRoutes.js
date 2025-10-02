// src/routes/requestsRoutes.js
const express = require('express');
const router = express.Router();
const requestsController = require('../controllers/requestsController');
const { protect } = require('../middleware/authMiddleware');

// Borrower: Create a rental request
router.post('/', protect, requestsController.createRentalRequest);

// Lender: Get all incoming requests for my items
router.get('/incoming', protect, requestsController.getIncomingRequests); // <-- ADD THIS LINE

// Lender: Respond to a specific request (accept/reject)
router.put('/:requestId/respond', protect, requestsController.respondToRequest); // <-- ADD THIS LINE

module.exports = router;