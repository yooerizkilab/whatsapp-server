const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Create a rate limiter middleware with configurable options
 * @param {Object} options - Configuration options
 * @returns {Function} - Express middleware
 */
const createRateLimiter = (options = {}) => {
  // Default options
  const defaultOptions = {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // Limit each IP to 60 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      status: false,
      message: 'Too many requests, please try again later.'
    }
  };

  // Merge default options with provided options
  const limiterOptions = { ...defaultOptions, ...options };

  // Create rate limiter
  return rateLimit(limiterOptions);
};

/**
 * Global rate limiter middleware (applies to all routes)
 */
const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_GLOBAL || '100') // Default: 100 requests per minute
});

/**
 * Rate limiter for message sending routes (stricter limits)
 */
const messageLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MESSAGES || '60') // Default: 60 messages per minute
});

/**
 * Rate limiter for session management (very strict to prevent abuse)
 */
const sessionLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: parseInt(process.env.RATE_LIMIT_SESSIONS || '10') // Default: 10 session operations per 10 minutes
});

module.exports = {
  globalLimiter,
  messageLimiter,
  sessionLimiter,
  createRateLimiter
};