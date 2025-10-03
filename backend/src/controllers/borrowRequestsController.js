const db = require('../config/db');

// Get all open borrow requests
exports.getAllBorrowRequests = async (req, res) => {
    try {
        const query = `
            SELECT br.*, u.name as requester_name 
            FROM borrow_requests br
            JOIN users u ON br.requester_id = u.id
            WHERE br.status = 'OPEN' 
            ORDER BY br.created_at DESC
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching borrow requests:', error);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
};

// Create a new borrow request
exports.createBorrowRequest = async (req, res) => {
    const requesterId = req.user.id;
    const { item_type, book_title, book_author, course_name, course_code, slot } = req.body;

    if (!item_type || !course_name || !course_code || !slot) {
        return res.status(400).json({ error: 'Please fill out all required fields.' });
    }

    try {
        const query = `
            INSERT INTO borrow_requests (requester_id, item_type, book_title, book_author, course_name, course_code, slot)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [requesterId, item_type, book_title, book_author, course_name, course_code, slot];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'Borrow request created successfully!',
            request: result.rows[0],
        });
    } catch (error) {
        console.error('Error creating borrow request:', error);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
};