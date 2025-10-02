const db = require('../config/db');

// Borrower: Create a rental request
exports.createRentalRequest = async (req, res) => {
  const borrowerId = req.user.id;
  const { listing_id } = req.body;

  if (!listing_id) {
    return res.status(400).json({ error: 'Listing ID is required.' });
  }

  try {
    // 1. Check if listing exists and is AVAILABLE
    const listingResult = await db.query(
      "SELECT * FROM listings WHERE id = $1 AND status = 'AVAILABLE'",
      [listing_id]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found or unavailable.' });
    }
    const listing = listingResult.rows[0];

    // 2. Prevent self-borrowing
    if (listing.lender_id === borrowerId) {
      return res.status(400).json({ error: 'You cannot borrow your own item.' });
    }

    // 3. Prevent duplicate pending request
    const existingRequest = await db.query(
      "SELECT * FROM rental_requests WHERE listing_id = $1 AND borrower_id = $2 AND status = 'PENDING'",
      [listing_id, borrowerId]
    );
    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'You already requested this item.' });
    }

    // 4. Create request
    const query = `
      INSERT INTO rental_requests (listing_id, borrower_id, status)
      VALUES ($1, $2, 'PENDING')
      RETURNING *;
    `;
    const result = await db.query(query, [listing_id, borrowerId]);

    res.status(201).json({
      message: 'Your request has been sent.',
      request: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating rental request:', error);
    res.status(500).json({ error: 'Unexpected error.' });
  }
};

// Lender: Get all incoming requests
exports.getIncomingRequests = async (req, res) => {
  const lenderId = req.user.id;

  try {
    const query = `
      SELECT
        rr.id,
        rr.status,
        rr.created_at,
        l.book_title,
        l.course_name,
        u.name as borrower_name
      FROM rental_requests rr
      JOIN listings l ON rr.listing_id = l.id
      JOIN users u ON rr.borrower_id = u.id
      WHERE l.lender_id = $1 AND rr.status = 'PENDING'
      ORDER BY rr.created_at ASC;
    `;
    const result = await db.query(query, [lenderId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Unexpected error.' });
  }
};

// Lender: Respond to a request
exports.respondToRequest = async (req, res) => {
  const lenderId = req.user.id;
  const { requestId } = req.params;
  const { decision } = req.body; // 'ACCEPTED' or 'REJECTED'

  if (!['ACCEPTED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision.' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Get request and check ownership
    const requestQuery = `
      SELECT rr.*, l.lender_id, l.id as listing_id 
      FROM rental_requests rr
      JOIN listings l ON rr.listing_id = l.id
      WHERE rr.id = $1
    `;
    const requestResult = await client.query(requestQuery, [requestId]);

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found.' });
    }

    const request = requestResult.rows[0];

    // 2. Authorization & status
    if (request.lender_id !== lenderId) {
      await client.query('ROLLBACK');
      return res.status(401).json({ error: 'Not authorized.' });
    }
    if (request.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Request already actioned.' });
    }

    // 3. Actions
    if (decision === 'ACCEPTED') {
      await client.query(
        "UPDATE rental_requests SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1",
        [requestId]
      );
      await client.query(
        "UPDATE listings SET status = 'LENT', updated_at = NOW() WHERE id = $1",
        [request.listing_id]
      );
      await client.query(
        "UPDATE rental_requests SET status = 'REJECTED', updated_at = NOW() WHERE listing_id = $1 AND status = 'PENDING'",
        [request.listing_id]
      );
    } else {
      await client.query(
        "UPDATE rental_requests SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
        [requestId]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ message: `Request ${decision.toLowerCase()}.` });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error responding to request:', error);
    res.status(500).json({ error: 'Unexpected error.' });
  } finally {
    client.release();
  }
};
