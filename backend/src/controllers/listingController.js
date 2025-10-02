const db = require('../config/db');
const cloudinary = require('../config/cloudinary');

// GET ALL LISTINGS (with filtering, searching, and sorting)
exports.getAllListings = async (req, res) => {
  try {
    const { item_type, sort, search } = req.query;

    let query = `SELECT * FROM listings WHERE status = 'AVAILABLE'`;
    const queryParams = [];

    // 1. Filtering logic
    if (item_type) {
      queryParams.push(item_type);
      query += ` AND item_type = $${queryParams.length}`;
    }

    // 2. Searching logic (case-insensitive)
    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (book_title ILIKE $${queryParams.length} OR course_name ILIKE $${queryParams.length} OR course_code ILIKE $${queryParams.length})`;
    }

    // 3. Sorting logic
    if (sort === 'oldest') {
      query += ' ORDER BY created_at ASC';
    } else {
      // Default to newest
      query += ' ORDER BY created_at DESC';
    }

    const result = await db.query(query, queryParams);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};

// GET A SINGLE LISTING BY ID
exports.getListingById = async (req, res) => {
  try {
    const { id } = req.params; // Get the ID from the URL parameter

    const query = 'SELECT * FROM listings WHERE id = $1';
    const result = await db.query(query, [id]);

    // Check if a listing was found
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching listing by ID:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};

// CREATE A LISTING
exports.createListing = async (req, res) => {
  const lenderId = req.user.id;
  // Text fields are in req.body
  const {
    item_type, book_title, book_author, course_name,
    course_code, modules_included, contact_details, collection_point
  } = req.body;
  
  let photoUrl = null;

  try {
    // Check if a file was uploaded
    if (req.file) {
      // Upload to Cloudinary from buffer
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "book_rental" }, // Optional: organize uploads in a folder
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      photoUrl = result.secure_url;
    }

    const query = `
      INSERT INTO listings 
        (lender_id, item_type, book_title, book_author, course_name, course_code, modules_included, contact_details, collection_point, photo_url) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
    `;
    const values = [lenderId, item_type, book_title, book_author, course_name, course_code, modules_included, contact_details, collection_point, photoUrl];
    
    const dbResult = await db.query(query, values);

    res.status(201).json({
      message: 'Listing created successfully!',
      listing: dbResult.rows[0],
    });

  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};

// UPDATE A LISTING
exports.updateListing = async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = req.user.id;
    const {
      item_type,
      book_title,
      book_author,
      course_name,
      course_code,
      modules_included,
      contact_details,
      collection_point,
      photo_url,
      status
    } = req.body;

    // 1. First, find the listing to make sure it exists
    const listingResult = await db.query('SELECT * FROM listings WHERE id = $1', [listingId]);
    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    const listing = listingResult.rows[0];

    // 2. **CRITICAL** Authorize the user: check if the user owns the listing
    if (listing.lender_id !== userId) {
      return res.status(401).json({ error: 'User not authorized to edit this listing.' });
    }

    // 3. If authorized, update the listing
    const updateQuery = `
      UPDATE listings 
      SET item_type = $1, book_title = $2, book_author = $3, course_name = $4, course_code = $5, modules_included = $6, contact_details = $7, collection_point = $8, photo_url = $9, status = $10, updated_at = NOW()
      WHERE id = $11 RETURNING *
    `;
    const values = [item_type, book_title, book_author, course_name, course_code, modules_included, contact_details, collection_point, photo_url, status, listingId];

    const updatedResult = await db.query(updateQuery, values);

    res.status(200).json({ message: 'Listing updated successfully!', listing: updatedResult.rows[0] });

  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};

// DELETE A LISTING
exports.deleteListing = async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = req.user.id;
    
    // 1. Find the listing
    const listingResult = await db.query('SELECT * FROM listings WHERE id = $1', [listingId]);
    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    const listing = listingResult.rows[0];

    // 2. **CRITICAL** Authorize the user
    if (listing.lender_id !== userId) {
      return res.status(401).json({ error: 'User not authorized to delete this listing.' });
    }

    // 3. If authorized, delete the listing
    await db.query('DELETE FROM listings WHERE id = $1', [listingId]);

    res.status(200).json({ message: 'Listing deleted successfully.' });

  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};