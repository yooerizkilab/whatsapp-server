const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Authentication middleware for API requests
 * Validates API key or token for secure access
 */
const authMiddleware = (req, res, next) => {
  try {
    // Get API key from request header
    const apiKey = req.header('X-API-Key');
    
    // Get configured API key from environment variable
    const configuredApiKey = process.env.API_KEY;
    
    // If API key is not required (development mode), skip validation
    if (process.env.NODE_ENV === 'development' && !configuredApiKey) {
      return next();
    }
    
    // If API key is not provided, return unauthorized
    if (!apiKey) {
      return res.status(401).json({
        status: false,
        message: 'API key is required'
      });
    }
    
    // If API key is invalid, return forbidden
    if (apiKey !== configuredApiKey) {
      return res.status(403).json({
        status: false,
        message: 'Invalid API key'
      });
    }
    
    // API key is valid, proceed to next middleware
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      status: false,
      message: 'Authentication error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = authMiddleware;