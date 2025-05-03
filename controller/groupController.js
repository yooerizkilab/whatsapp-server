const sessionManager = require('../service/sessionManager');
const groupHandler = require('../helpers/groupHandler');

/**
 * Create a new WhatsApp group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createGroup = async (req, res) => {
  try {
    // Get data from request body
    const {
      sessionId,
      name,
      participants,
      description = '',
      delay = 1000
    } = req.body;
    
    // Validate required fields
    if (!sessionId || !name || !participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, group name, and at least one participant are required'
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
    
    // Create group
    const result = await groupHandler.createGroup(
      session.socket,
      name,
      participants,
      description,
      { delay }
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to create group',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add participants to a WhatsApp group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addGroupParticipants = async (req, res) => {
  try {
    // Get data from request body
    const {
      sessionId,
      groupId,
      participants,
      delay = 1000
    } = req.body;
    
    // Validate required fields
    if (!sessionId || !groupId || !participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, group ID, and at least one participant are required'
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
    
    // Add participants
    const result = await groupHandler.addGroupParticipants(
      session.socket,
      groupId,
      participants,
      { delay }
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error adding group participants:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to add participants',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove participants from a WhatsApp group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeGroupParticipants = async (req, res) => {
  try {
    // Get data from request body
    const {
      sessionId,
      groupId,
      participants,
      delay = 1000
    } = req.body;
    
    // Validate required fields
    if (!sessionId || !groupId || !participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, group ID, and at least one participant are required'
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
    
    // Remove participants
    const result = await groupHandler.removeGroupParticipants(
      session.socket,
      groupId,
      participants,
      { delay }
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error removing group participants:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to remove participants',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send a message to a WhatsApp group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendGroupMessage = async (req, res) => {
  try {
    // Get data from request body
    const {
      sessionId,
      groupId,
      message,
      useQueue = true,
      queueOnly = false,
      delay = 1000,
      retry = 3
    } = req.body;
    
    // Validate required fields
    if (!sessionId || !groupId || !message) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, group ID, and message are required'
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
    
    // Send group message
    const result = await groupHandler.sendGroupMessage(
      session.socket,
      groupId,
      message,
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
    console.error('Error sending group message:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to send group message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get group information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getGroupInfo = async (req, res) => {
  try {
    // Get data from request params
    const { sessionId, groupId } = req.params;
    
    // Validate required fields
    if (!sessionId || !groupId) {
      return res.status(400).json({
        status: false,
        message: 'Session ID and group ID are required'
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
    
    // Get group info
    const result = await groupHandler.getGroupInfo(
      session.socket,
      groupId
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting group info:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to get group info',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Leave a WhatsApp group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const leaveGroup = async (req, res) => {
  try {
    // Get data from request body
    const { sessionId, groupId } = req.body;
    
    // Validate required fields
    if (!sessionId || !groupId) {
      return res.status(400).json({
        status: false,
        message: 'Session ID and group ID are required'
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
    
    // Leave group
    const result = await groupHandler.leaveGroup(
      session.socket,
      groupId
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to leave group',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update group subject (name)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateGroupSubject = async (req, res) => {
  try {
    // Get data from request body
    const { sessionId, groupId, subject } = req.body;
    
    // Validate required fields
    if (!sessionId || !groupId || !subject) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, group ID, and subject are required'
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
    
    // Update group subject
    const result = await groupHandler.updateGroupSubject(
      session.socket,
      groupId,
      subject
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error updating group subject:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to update group subject',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update group description
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateGroupDescription = async (req, res) => {
  try {
    // Get data from request body
    const { sessionId, groupId, description } = req.body;
    
    // Validate required fields
    if (!sessionId || !groupId || !description) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, group ID, and description are required'
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
    
    // Update group description
    const result = await groupHandler.updateGroupDescription(
      session.socket,
      groupId,
      description
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error updating group description:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to update group description',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createGroup,
  addGroupParticipants,
  removeGroupParticipants,
  sendGroupMessage,
  getGroupInfo,
  leaveGroup,
  updateGroupSubject,
  updateGroupDescription
};