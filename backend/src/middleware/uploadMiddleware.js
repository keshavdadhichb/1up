// src/middleware/uploadMiddleware.js
const multer = require('multer');

// We use memory storage to avoid saving the file to disk on our server.
// The file will be available in memory as a buffer.
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

module.exports = upload;