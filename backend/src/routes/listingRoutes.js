const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // <-- add this

// Create listing with image upload
router.post('/', protect, upload.single('photo'), listingsController.createListing);

router.get('/', listingsController.getAllListings);
router.get('/:id', listingsController.getListingById);
router.put('/:id', protect, listingsController.updateListing);
router.delete('/:id', protect, listingsController.deleteListing);

module.exports = router;
