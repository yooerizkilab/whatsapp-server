const sessionManager = require('../service/sessionManager');
const messageHandler = require('../helpers/messageHandler');
const mediaHandler = require('../helpers/mediaHandler');
const queueHandler = require('../helpers/queueHandler');

/**
 * Send a text message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendTextMessage = async (req, res) => {
  try {
    // Get data from request body
    const {
      sessionId,
      to,
      text,
      quotedMessageId,
      useQueue = true,
      queueOnly = false,
      delay = 1000,
      retry = 3
    } = req.body;
    
    // Validate required fields
    if (!sessionId || !to || !text) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, recipient, and message text are required'
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
    
    // If session is not connected, return error
    if (session.status !== 'open') {
      return res.status(400).json({
        status: false,
        message: 'Session is not connected'
      });
    }
    
    // Send message
    const result = await messageHandler.sendTextMessage(
      session.socket,
      to,
      text,
      {
        sessionId,
        quotedMessageId,
        useQueue,
        queueOnly,
        delay,
        retry
      }
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error sending text message:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send a template message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendTemplateMessage = async (req, res) => {
  try {
    // Get data from request body
    const {
      sessionId,
      to,
      template,
      useQueue = true,
      queueOnly = false,
      delay = 1000,
      retry = 3
    } = req.body;
    
    // Validate required fields
    if (!sessionId || !to || !template) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, recipient, and template are required'
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
    
    // If session is not connected, return error
    if (session.status !== 'open') {
      return res.status(400).json({
        status: false,
        message: 'Session is not connected'
      });
    }
    
    // Send template message
    const result = await messageHandler.sendTemplateMessage(
      session.socket,
      to,
      template,
      {
        sessionId,
        useQueue,
        queueOnly,
        delay,
        retry
      }
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error sending template message:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to send template message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send an image message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendImageMessage = async (req, res) => {
  try {
    // Get data from request body
    const {
      sessionId,
      to,
      image,
      caption = '',
      quotedMessageId,
      useQueue = true,
      queueOnly = false,
      delay = 1000,
      retry = 3
    } = req.body;
    
    // Validate required fields
    if (!sessionId || !to || !image) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, recipient, and image are required'
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
    
    // If session is not connected, return error
    if (session.status !== 'open') {
      return res.status(400).json({
        status: false,
        message: 'Session is not connected'
      });
    }
    
    // Send image message
    const result = await mediaHandler.sendImageMessage(
      session.socket,
      to,
      image,
      caption,
      {
        sessionId,
        quotedMessageId,
        useQueue,
        queueOnly,
        delay,
        retry
      }
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error sending image message:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to send image message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send a document message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendDocumentMessage = async (req, res) => {
  try {
    // Get data from request body
    const {
      sessionId,
      to,
      document,
      filename,
      caption = '',
      quotedMessageId,
      useQueue = true,
      queueOnly = false,
      delay = 1000,
      retry = 3
    } = req.body;
    
    // Validate required fields
    if (!sessionId || !to || !document || !filename) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, recipient, document, and filename are required'
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
    
    // If session is not connected, return error
    if (session.status !== 'open') {
      return res.status(400).json({
        status: false,
        message: 'Session is not connected'
      });
    }
    
    // Send document message
    const result = await mediaHandler.sendDocumentMessage(
      session.socket,
      to,
      document,
      filename,
      caption,
      {
        sessionId,
        quotedMessageId,
        useQueue,
        queueOnly,
        delay,
        retry
      }
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error sending document message:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to send document message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get message queue status for a session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQueueStatus = async (req, res) => {
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
    
    // Get queue status
    const queueStatus = queueHandler.getQueueStatus(sessionId);
    
    return res.status(200).json({
      status: true,
      queue: queueStatus
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to get queue status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Clear message queue for a session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const clearQueue = async (req, res) => {
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
    
    // Clear queue
    const result = queueHandler.clearQueue(sessionId);
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error clearing queue:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to clear queue',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Validate a phone number
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const validateNumber = async (req, res) => {
  try {
    // Get data from request body
    const { sessionId, phoneNumber } = req.body;
    
    // Validate required fields
    if (!sessionId || !phoneNumber) {
      return res.status(400).json({
        status: false,
        message: 'Session ID and phone number are required'
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
    
    // If session is not connected, return error
    if (session.status !== 'open') {
      return res.status(400).json({
        status: false,
        message: 'Session is not connected'
      });
    }
    
    // Validate number
    const result = await messageHandler.validateNumber(session.socket, phoneNumber);
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error validating number:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to validate number',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  sendTextMessage,
  sendTemplateMessage,
  sendImageMessage,
  sendDocumentMessage,
  getQueueStatus,
  clearQueue,
  validateNumber
};