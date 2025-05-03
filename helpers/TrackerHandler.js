/**
 * Message tracking system to prevent duplicates across all message types
 */

// Store for tracking recently sent messages
const recentMessages = new Map();

// Maximum age for tracked messages (5 minutes in milliseconds)
const MESSAGE_TRACKING_TTL = 5 * 60 * 1000;

/**
 * Generate a unique key for a message
 * @param {string} sessionId - The session ID
 * @param {string} recipient - Recipient identifier
 * @param {string} type - Message type (text, image, etc.)
 * @param {any} content - Message content or identifier
 * @returns {string} - Unique message key
 */
const generateMessageKey = (sessionId, recipient, type, content) => {
  // For content that might be very long (like base64 images), create a hash or truncate
  let contentIdentifier = content;
  
  if (typeof content === 'string') {
    if (content.length > 100) {
      // For long strings, use first 50 chars + length as a simple "hash"
      contentIdentifier = `${content.substring(0, 50)}...${content.length}`;
    }
  } else if (typeof content === 'object') {
    // For objects (like templates), convert to string
    contentIdentifier = JSON.stringify(content).substring(0, 50);
  }
  
  return `${sessionId}:${recipient}:${type}:${contentIdentifier}`;
};

/**
 * Check if a message was recently sent
 * @param {string} sessionId - The session ID
 * @param {string} recipient - Recipient identifier (phone number or group ID)
 * @param {string} type - Message type (text, image, document, etc.)
 * @param {any} content - Message content or identifier
 * @returns {boolean} - True if this is a duplicate message
 */
const isDuplicateMessage = (sessionId, recipient, type, content) => {
  const messageKey = generateMessageKey(sessionId, recipient, type, content);
  const now = Date.now();
  
  // Clean up old entries periodically (when checking for duplicates)
  if (Math.random() < 0.1) { // Do cleanup ~10% of the time
    for (const [key, timestamp] of recentMessages.entries()) {
      if (now - timestamp > MESSAGE_TRACKING_TTL) {
        recentMessages.delete(key);
      }
    }
  }
  
  // Check if this is a duplicate message
  if (recentMessages.has(messageKey)) {
    const timestamp = recentMessages.get(messageKey);
    if (now - timestamp < MESSAGE_TRACKING_TTL) {
      return true;
    }
  }
  
  // Not a duplicate, record this message
  recentMessages.set(messageKey, now);
  return false;
};

/**
 * Record a message as sent
 * @param {string} sessionId - The session ID
 * @param {string} recipient - Recipient identifier
 * @param {string} type - Message type
 * @param {any} content - Message content or identifier
 */
const recordMessage = (sessionId, recipient, type, content) => {
  const messageKey = generateMessageKey(sessionId, recipient, type, content);
  recentMessages.set(messageKey, Date.now());
};

module.exports = {
  isDuplicateMessage,
  recordMessage
};