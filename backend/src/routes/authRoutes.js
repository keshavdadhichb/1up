// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route to generate and send an OTP
router.post('/generate-otp', authController.generateOtp);

// Route to verify OTP and log in the user  <-- ADD THIS LINE
router.post('/verify-otp', authController.verifyOtp);

module.exports = router;