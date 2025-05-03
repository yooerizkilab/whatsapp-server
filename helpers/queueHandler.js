const fs = require('fs');
const path = require('path');

// Queue processors
const processors = {};
// Queue status
const queueStatus = {};

/**
 * Initialize a queue for a session
 * @param {string} queueId - Queue identifier (usually session ID)
 * @returns {Object} - Queue data
 */
const initQueue = (queueId) => {
  const queueDir = path.join(process.cwd(), 'queue');
  const queueFile = path.join(queueDir, `${queueId}.json`);
  
  // Create queue directory if it doesn't exist
  if (!fs.existsSync(queueDir)) {
    fs.mkdirSync(queueDir, { recursive: true });
  }

  // Create or load queue file
  if (!fs.existsSync(queueFile)) {
    const initialQueue = {
      items: [],
      processing: false,
      lastProcessed: null,
      stats: {
        total: 0,
        success: 0,
        failed: 0
      }
    };
    fs.writeFileSync(queueFile, JSON.stringify(initialQueue, null, 2));
    return initialQueue;
  } else {
    try {
      const queueData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
      return queueData;
    } catch (error) {
      console.error(`Error reading queue file for ${queueId}:`, error);
      // If file is corrupted, create a new one
      const initialQueue = {
        items: [],
        processing: false,
        lastProcessed: null,
        stats: {
          total: 0,
          success: 0,
          failed: 0
        }
      };
      fs.writeFileSync(queueFile, JSON.stringify(initialQueue, null, 2));
      return initialQueue;
    }
  }
};

/**
 * Get queue data for a session
 * @param {string} queueId - Queue identifier
 * @returns {Object} - Queue data
 */
const getQueue = (queueId) => {
  // Initialize queue if not exists
  return initQueue(queueId);
};

/**
 * Save queue data to file
 * @param {string} queueId - Queue identifier
 * @param {Object} queueData - Queue data
 */
const saveQueue = (queueId, queueData) => {
  const queueFile = path.join(process.cwd(), 'queue', `${queueId}.json`);
  fs.writeFileSync(queueFile, JSON.stringify(queueData, null, 2));
};

/**
 * Add a message to the queue
 * @param {string} queueId - Queue identifier
 * @param {Object} message - Message data
 * @returns {Promise<Object>} - Result
 */
const addToQueue = async (queueId, message) => {
  // Get queue data
  const queueData = getQueue(queueId);
  
  // Add timestamp if not provided
  if (!message.timestamp) {
    message.timestamp = Date.now();
  }
  
  // Add message to queue
  queueData.items.push(message);
  queueData.stats.total++;
  
  // Save queue
  saveQueue(queueId, queueData);
  
  // Start processing if not already running
  if (!queueStatus[queueId] || !queueStatus[queueId].processing) {
    startQueueProcessor(queueId);
  }
  
  return {
    status: true,
    message: 'Added to queue',
    queueLength: queueData.items.length,
    queueId
  };
};

/**
 * Process the next message in the queue
 * @param {string} queueId - Queue identifier
 * @param {Object} socket - WhatsApp socket
 * @returns {Promise<boolean>} - Success status
 */
const processNextInQueue = async (queueId, socket) => {
  // Get queue data
  const queueData = getQueue(queueId);
  
  // Check if there are items in the queue
  if (queueData.items.length === 0) {
    return false;
  }
  
  // Get next message from queue
  const message = queueData.items.shift();
  
  try {
    // Import handlers on-demand to avoid circular dependencies
    const messageHandler = require('./messageHandler');
    const mediaHandler = require('./mediaHandler');
    const groupHandler = require('./groupHandler');
    
    // Process message based on type
    let result;
    
    switch (message.type) {
      case 'text':
        result = await messageHandler.sendTextMessage(
          socket,
          message.recipient,
          message.content,
          { ...message.options, useQueue: false }
        );
        break;
        
      case 'image':
        result = await mediaHandler.sendImageMessage(
          socket,
          message.recipient,
          message.content,
          message.caption || '',
          { ...message.options, useQueue: false }
        );
        break;
        
      case 'document':
        result = await mediaHandler.sendDocumentMessage(
          socket,
          message.recipient,
          message.content,
          message.filename || 'document',
          message.caption || '',
          { ...message.options, useQueue: false }
        );
        break;
        
      case 'audio':
        result = await mediaHandler.sendAudioMessage(
          socket,
          message.recipient,
          message.content,
          message.ptt || false,
          { ...message.options, useQueue: false }
        );
        break;
        
      case 'location':
        result = await mediaHandler.sendLocationMessage(
          socket,
          message.recipient,
          message.latitude,
          message.longitude,
          message.name || '',
          message.address || '',
          { ...message.options, useQueue: false }
        );
        break;
        
      case 'group-message':
        result = await groupHandler.sendGroupMessage(
          socket,
          message.groupId,
          message.content,
          { ...message.options, useQueue: false }
        );
        break;
        
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
    
    // Update queue stats
    queueData.stats.success++;
    queueData.lastProcessed = Date.now();
    
    // Save queue
    saveQueue(queueId, queueData);
    
    return true;
  } catch (error) {
    console.error(`Error processing queue item for ${queueId}:`, error);
    
    // Update queue stats
    queueData.stats.failed++;
    queueData.lastProcessed = Date.now();
    
    // If retry is enabled and count is not depleted, add back to queue
    if (message.options && message.options.retry && message.options.retry > 0) {
      message.options.retry--;
      queueData.items.push(message);
    }
    
    // Save queue
    saveQueue(queueId, queueData);
    
    return false;
  }
};

/**
 * Start queue processor for a session
 * @param {string} queueId - Queue identifier
 * @returns {boolean} - Success status
 */
const startQueueProcessor = (queueId) => {
  // Check if processor is already running
  if (queueStatus[queueId] && queueStatus[queueId].processing) {
    return false;
  }
  
  // Set queue status to processing
  queueStatus[queueId] = {
    processing: true,
    startTime: Date.now()
  };
  
  // Start processor interval
  processors[queueId] = setInterval(async () => {
    try {
      // Get socket from session manager
      const sessionManager = require('../service/sessionManager');
      const connection = sessionManager.getSession(queueId);
      
      // If no connection or not connected, stop processor
      if (!connection || connection.status !== 'open') {
        stopQueueProcessor(queueId);
        return;
      }
      
      // Process next message
      const processed = await processNextInQueue(queueId, connection.socket);
      
      // If no messages to process, stop processor
      if (!processed) {
        const queueData = getQueue(queueId);
        if (queueData.items.length === 0) {
          stopQueueProcessor(queueId);
        }
      }
    } catch (error) {
      console.error(`Error in queue processor for ${queueId}:`, error);
    }
  }, 1000); // Process one message per second
  
  return true;
};

/**
 * Stop queue processor for a session
 * @param {string} queueId - Queue identifier
 * @returns {boolean} - Success status
 */
const stopQueueProcessor = (queueId) => {
  // Check if processor is running
  if (!processors[queueId]) {
    return false;
  }
  
  // Clear interval
  clearInterval(processors[queueId]);
  delete processors[queueId];
  
  // Update queue status
  queueStatus[queueId] = {
    processing: false,
    stopTime: Date.now()
  };
  
  return true;
};

/**
 * Get queue status for a session
 * @param {string} queueId - Queue identifier
 * @returns {Object} - Queue status
 */
const getQueueStatus = (queueId) => {
  // Get queue data
  const queueData = getQueue(queueId);
  
  return {
    itemsInQueue: queueData.items.length,
    processing: queueStatus[queueId] ? queueStatus[queueId].processing : false,
    lastProcessed: queueData.lastProcessed,
    stats: queueData.stats
  };
};

/**
 * Clear queue for a session
 * @param {string} queueId - Queue identifier
 * @returns {Object} - Result
 */
const clearQueue = (queueId) => {
  // Stop processor if running
  if (processors[queueId]) {
    stopQueueProcessor(queueId);
  }
  
  // Get queue data
  const queueData = getQueue(queueId);
  
  // Clear items
  const removedCount = queueData.items.length;
  queueData.items = [];
  
  // Save queue
  saveQueue(queueId, queueData);
  
  return {
    status: true,
    message: 'Queue cleared',
    removedCount,
    queueId
  };
};

module.exports = {
  addToQueue,
  getQueue,
  getQueueStatus,
  startQueueProcessor,
  stopQueueProcessor,
  clearQueue
};