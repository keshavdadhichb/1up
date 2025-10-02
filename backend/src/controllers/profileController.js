// src/controllers/profileController.js
const db = require('../config/db');

// Get all listings for the logged-in user
exports.getMyListings = async (req, res) => {
  const userId = req.user.id;
  try {
    const query = 'SELECT * FROM listings WHERE lender_id = $1 ORDER BY created_at DESC';
    const result = await db.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching user listings:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};

// Get all outgoing rental requests made by the logged-in user
exports.getOutgoingRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    // This query joins with the listings table to get the title of the item being requested
    const query = `
      SELECT 
        rr.id,
        rr.status,
        rr.created_at,
        l.book_title,
        l.course_name
      FROM rental_requests rr
      JOIN listings l ON rr.listing_id = l.id
      WHERE rr.borrower_id = $1
      ORDER BY rr.created_at DESC;
    `;
    const result = await db.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching outgoing requests:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};