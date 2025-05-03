const sessionManager = require('../service/sessionManager');
const callHandler = require('../helpers/callHandler');

/**
 * Update call handling settings for a session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateCallSettings = async (req, res) => {
  try {
    // Get data from request body
    const {
      sessionId,
      rejectCalls = true,
      rejectVideoCalls = true,
      sendReplyMessage = true,
      audioCallReplyMessage,
      videoCallReplyMessage,
      delay
    } = req.body;
    
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
    
    // If session is not connected, return error
    if (session.status !== 'open') {
      return res.status(400).json({
        status: false,
        message: 'Session is not connected'
      });
    }
    
    // Update call settings
    const callSettings = {
      sessionId,
      rejectCalls,
      rejectVideoCalls,
      sendReplyMessage
    };
    
    // Add optional settings if provided
    if (audioCallReplyMessage) callSettings.audioCallReplyMessage = audioCallReplyMessage;
    if (videoCallReplyMessage) callSettings.videoCallReplyMessage = videoCallReplyMessage;
    if (delay !== undefined) callSettings.delay = delay;
    
    // Set up call handler with new settings
    callHandler.setupCallHandler(session.socket, callSettings);
    
    return res.status(200).json({
      status: true,
      message: 'Call settings updated successfully',
      settings: callSettings
    });
  } catch (error) {
    console.error('Error updating call settings:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to update call settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  updateCallSettings
};