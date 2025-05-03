const sessionManager = require('../service/sessionManager');

/**
 * Create a new WhatsApp session or get existing one
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createSession = async (req, res) => {
  try {
    // Get session ID from request body
    const { sessionId } = req.body;
    
    // Validate session ID
    if (!sessionId) {
      return res.status(400).json({
        status: false,
        message: 'Session ID is required'
      });
    }
    
    // Create or get session
    const session = await sessionManager.createSession(sessionId);
    
    return res.status(200).json({
      status: true,
      message: 'Session created or restored successfully',
      session: {
        id: sessionId,
        status: session.status,
        qr: session.qr
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to create session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get session information, including QR code if available
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSession = async (req, res) => {
  try {
    // Get session ID from request params
    const { sessionId } = req.params;
    
    // Validate session ID
    if (!sessionId) {
      return res.status(400).json({
        status: false,
        message: 'Session ID is required'
      });
    }
    
    // Get session
    const session = sessionManager.getSession(sessionId);
    
    // If session doesn't exist, return error
    if (!session) {
      return res.status(404).json({
        status: false,
        message: 'Session not found'
      });
    }
    
    return res.status(200).json({
      status: true,
      session: {
        id: sessionId,
        status: session.status,
        qr: session.qr
      }
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to get session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a WhatsApp session and disconnect
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteSession = async (req, res) => {
  try {
    // Get session ID from request params
    const { sessionId } = req.params;
    
    // Validate session ID
    if (!sessionId) {
      return res.status(400).json({
        status: false,
        message: 'Session ID is required'
      });
    }
    
    // Delete session
    const result = await sessionManager.deleteSession(sessionId);
    
    // If session doesn't exist, return error
    if (!result) {
      return res.status(404).json({
        status: false,
        message: 'Session not found or already deleted'
      });
    }
    
    return res.status(200).json({
      status: true,
      message: 'Session deleted successfully',
      sessionId
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to delete session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get QR code for a session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSessionQR = async (req, res) => {
  try {
    // Get session ID from request params
    const { sessionId } = req.params;
    
    // Validate session ID
    if (!sessionId) {
      return res.status(400).json({
        status: false,
        message: 'Session ID is required'
      });
    }
    
    // Get session
    const session = sessionManager.getSession(sessionId);
    
    // If session doesn't exist, return error
    if (!session) {
      return res.status(404).json({
        status: false,
        message: 'Session not found'
      });
    }
    
    // If session is already connected, no QR code is available
    if (session.status === 'open') {
      return res.status(200).json({
        status: true,
        message: 'Session is already connected',
        connected: true,
        qr: null
      });
    }
    
    // Get QR code
    const qr = session.qr;
    
    // If QR code is not available, return error
    if (!qr) {
      return res.status(202).json({
        status: true,
        message: 'QR code not yet available, try again later',
        qr: null
      });
    }
    
    return res.status(200).json({
      status: true,
      qr,
      connected: false
    });
  } catch (error) {
    console.error('Error getting QR code:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to get QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * List all active sessions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const listSessions = async (req, res) => {
  try {
    // Get sessions
    const sessions = sessionManager.listSessions();
    
    return res.status(200).json({
      status: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to list sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createSession,
  getSession,
  deleteSession,
  getSessionQR,
  listSessions
};