// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const listingRoutes = require('./src/routes/listingRoutes');
const requestRoutes = require('./src/routes/requestRoutes');
const profileRoutes = require('./src/routes/profileRoutes'); // <-- Added

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/profile', profileRoutes); // <-- Added

// A simple test route to make sure the server is working
app.get('/', (req, res) => {
  res.send('Book Rental API is running!');
});

// Test DB connection
const db = require('./src/config/db');
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ message: 'Database connection successful!', time: result.rows[0].now });
  } catch (error) {
    console.error('Database connection error', error);
    res.status(500).json({ error: 'Failed to connect to database' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
