const sessionManager = require('../service/sessionManager');
const queueHandler = require('../helpers/queueHandler');

/**
 * Get status of a WhatsApp session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSessionStatus = async (req, res) => {
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
        message: 'Session not found',
        exists: false
      });
    }
    
    // Get queue status
    const queue = queueHandler.getQueueStatus(sessionId);
    
    return res.status(200).json({
      status: true,
      session: {
        id: sessionId,
        status: session.status,
        isConnected: session.status === 'open',
        hasQueuedMessages: queue.itemsInQueue > 0
      },
      queue
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to get session status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get status of all WhatsApp sessions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllSessionsStatus = async (req, res) => {
  try {
    // Get all sessions
    const sessions = sessionManager.listSessions();
    
    // Get status for each session
    const sessionsStatus = sessions.map(session => ({
      id: session.id,
      status: session.status,
      isConnected: session.status === 'open'
    }));
    
    return res.status(200).json({
      status: true,
      count: sessionsStatus.length,
      sessions: sessionsStatus
    });
  } catch (error) {
    console.error('Error getting all sessions status:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to get all sessions status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check server health status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getServerStatus = async (req, res) => {
  try {
    // Get all sessions
    const sessions = sessionManager.listSessions();
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    return res.status(200).json({
      status: true,
      uptime: process.uptime(),
      timestamp: Date.now(),
      activeSessions: sessions.length,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`
      },
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Error getting server status:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to get server status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getSessionStatus,
  getAllSessionsStatus,
  getServerStatus
};