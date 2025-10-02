const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // <-- add this

// Create listing with image upload
router.post('/', protect, upload.single('photo'), listingController.createListing);

router.get('/', listingController.getAllListings);
router.get('/:id', listingController.getListingById);
router.put('/:id', protect, listingController.updateListing);
router.delete('/:id', protect, listingController.deleteListing);

module.exports = router;
