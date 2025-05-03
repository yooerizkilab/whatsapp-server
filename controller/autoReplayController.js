const sessionManager = require('../service/sessionManager');
const autoReplyHandler = require('../helpers/autoReplayHandler');

/**
 * Get auto-reply configuration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAutoReplyConfig = async (req, res) => {
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
    
    // Get auto-reply configuration
    const config = autoReplyHandler.getAutoReplyConfig(sessionId);
    
    return res.status(200).json({
      status: true,
      config
    });
  } catch (error) {
    console.error('Error getting auto-reply config:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to get auto-reply configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update auto-reply configuration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateAutoReplyConfig = async (req, res) => {
  try {
    // Get session ID and config from request body
    const { sessionId, config } = req.body;
    
    // Validate session ID and config
    if (!sessionId || !config) {
      return res.status(400).json({
        status: false,
        message: 'Session ID and configuration are required'
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
    
    // Update auto-reply configuration
    const updatedConfig = autoReplyHandler.updateAutoReplyConfig(sessionId, config);
    
    return res.status(200).json({
      status: true,
      message: 'Auto-reply configuration updated successfully',
      config: updatedConfig
    });
  } catch (error) {
    console.error('Error updating auto-reply config:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to update auto-reply configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add auto-reply rule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addAutoReplyRule = async (req, res) => {
  try {
    // Get session ID and rule from request body
    const { sessionId, rule } = req.body;
    
    // Validate session ID and rule
    if (!sessionId || !rule || !rule.type || !rule.trigger || !rule.response) {
      return res.status(400).json({
        status: false,
        message: 'Session ID and valid rule definition are required'
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
    
    // Add auto-reply rule
    const addedRule = autoReplyHandler.addAutoReplyRule(sessionId, rule);
    
    return res.status(200).json({
      status: true,
      message: 'Auto-reply rule added successfully',
      rule: addedRule
    });
  } catch (error) {
    console.error('Error adding auto-reply rule:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to add auto-reply rule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update auto-reply rule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateAutoReplyRule = async (req, res) => {
  try {
    // Get session ID, rule ID and updates from request body
    const { sessionId, ruleId, updates } = req.body;
    
    // Validate parameters
    if (!sessionId || !ruleId || !updates) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, rule ID and updates are required'
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
    
    // Update auto-reply rule
    const updatedRule = autoReplyHandler.updateAutoReplyRule(sessionId, ruleId, updates);
    
    if (!updatedRule) {
      return res.status(404).json({
        status: false,
        message: 'Rule not found'
      });
    }
    
    return res.status(200).json({
      status: true,
      message: 'Auto-reply rule updated successfully',
      rule: updatedRule
    });
  } catch (error) {
    console.error('Error updating auto-reply rule:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to update auto-reply rule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete auto-reply rule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteAutoReplyRule = async (req, res) => {
  try {
    // Get session ID and rule ID from request params
    const { sessionId, ruleId } = req.params;
    
    // Validate parameters
    if (!sessionId || !ruleId) {
      return res.status(400).json({
        status: false,
        message: 'Session ID and rule ID are required'
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
    
    // Delete auto-reply rule
    const deleted = autoReplyHandler.deleteAutoReplyRule(sessionId, ruleId);
    
    if (!deleted) {
      return res.status(404).json({
        status: false,
        message: 'Rule not found'
      });
    }
    
    return res.status(200).json({
      status: true,
      message: 'Auto-reply rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting auto-reply rule:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to delete auto-reply rule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAutoReplyConfig,
  updateAutoReplyConfig,
  addAutoReplyRule,
  updateAutoReplyRule,
  deleteAutoReplyRule
};