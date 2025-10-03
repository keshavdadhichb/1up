const express = require('express');
const router = express.Router();
const borrowRequestsController = require('../controllers/borrowRequestsController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/borrow-requests - Get all open borrow requests
router.get('/', protect, borrowRequestsController.getAllBorrowRequests);

// POST /api/borrow-requests - Create a new borrow request
router.post('/', protect, borrowRequestsController.createBorrowRequest);

module.exports = router;