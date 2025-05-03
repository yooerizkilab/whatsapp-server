const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const messageRoutes = require('./routes/message');
const groupRoutes = require('./routes/group');
const statusRoutes = require('./routes/status');
const sessionRoutes = require('./routes/session');
const callRoutes = require('./routes/call');
const autoReplyRoutes = require('./routes/autoReplay');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create necessary directories if they don't exist
const dirs = ['./sessions', './queue'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Authentication middleware
const authMiddleware = require('./middleware/auth');

// Routes
app.use('/api/session', sessionRoutes);
app.use('/api/message', authMiddleware, messageRoutes);
app.use('/api/auto-reply', authMiddleware, autoReplyRoutes);
app.use('/api/group', authMiddleware, groupRoutes);
app.use('/api/status', authMiddleware, statusRoutes);
app.use('/api/call', authMiddleware, callRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({
    status: true,
    message: 'WhatsApp API Server is running'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;