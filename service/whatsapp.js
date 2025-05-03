const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const pino = require('pino');
const callHandler = require('../helpers/callHandler');
const autoReplyHandler = require('../helpers/autoReplayHandler');

// Store all active connections
const connections = {};

// Create logger
const logger = pino({ level: 'silent' });

// Track reconnection attempts to prevent too many reconnections
const reconnectionAttempts = new Map();
const MAX_RECONNECTION_ATTEMPTS = 5; // Maximum attempts before giving up

/**
 * Initialize a WhatsApp connection for a specific session ID
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Promise<Object>} - Connection object
 */
const initializeConnection = async (sessionId) => {
  // If connection exists and is connected, return it
  if (connections[sessionId] && connections[sessionId].state === 'open') {
    return {
      socket: connections[sessionId].socket,
      qr: null,
      status: 'connected'
    };
  }

  // Prepare session directory
  const sessionDir = path.join(process.cwd(), 'sessions', sessionId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Use auth state
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  // Create socket connection
  const socket = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    logger
  });

  let qr = null;

  // Handle connection update event
  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr: newQr } = update;

    // If QR code is available, store it
    if (newQr) {
      try {
        // Convert QR to base64
        qr = await qrcode.toDataURL(newQr);
        
        // Store QR code in connections object
        if (connections[sessionId]) {
          connections[sessionId].qr = qr;
        }
      } catch (err) {
        console.error('QR generation error:', err);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom &&
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);

      console.log(`Connection closed for ${sessionId}. Reconnecting:`, shouldReconnect);

      // Update connection state
      if (connections[sessionId]) {
        connections[sessionId].state = 'closed';
      }

      // Reconnect if not logged out, but limit reconnection attempts
      if (shouldReconnect) {
        // Track reconnection attempts
        if (!reconnectionAttempts.has(sessionId)) {
          reconnectionAttempts.set(sessionId, 1);
        } else {
          reconnectionAttempts.set(sessionId, reconnectionAttempts.get(sessionId) + 1);
        }
        
        // Check if we've exceeded max attempts
        if (reconnectionAttempts.get(sessionId) <= MAX_RECONNECTION_ATTEMPTS) {
          console.log(`Reconnecting ${sessionId} (Attempt ${reconnectionAttempts.get(sessionId)}/${MAX_RECONNECTION_ATTEMPTS})...`);
          
          // Use exponential backoff for retry (1s, 2s, 4s, 8s, 16s)
          const delay = Math.min(1000 * Math.pow(2, reconnectionAttempts.get(sessionId) - 1), 30000);
          
          setTimeout(() => {
            initializeConnection(sessionId);
          }, delay);
        } else {
          console.log(`Too many reconnection attempts for ${sessionId}, giving up.`);
          // Clean up the connection
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }
          delete connections[sessionId];
          reconnectionAttempts.delete(sessionId);
        }
      } else {
        // If logged out, delete session files
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        
        // Remove from connections
        delete connections[sessionId];
        reconnectionAttempts.delete(sessionId);
      }
    } else if (connection === 'open') {
      console.log(`Connection established for ${sessionId}`);
      
      // Reset reconnection attempts counter
      reconnectionAttempts.delete(sessionId);
      
      // Update connection state
      if (connections[sessionId]) {
        connections[sessionId].state = 'open';
        connections[sessionId].qr = null;
      }
    }
  });

  // Handle credentials update event
  socket.ev.on('creds.update', saveCreds);

  // Store connection
  connections[sessionId] = {
    socket,
    qr,
    state: 'connecting'
  };

   // Setup auto-reply handling
  autoReplyHandler.setupAutoReply(socket, sessionId);

  // Setup call handling
  callHandler.setupCallHandler(socket, {
    sessionId,
    rejectCalls: true,
    rejectVideoCalls: true,
    sendReplyMessage: true
  });

  return {
    socket,
    qr,
    status: 'connecting'
  };
};

/**
 * Get existing connection
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Object|null} - Connection object or null if not found
 */
const getConnection = (sessionId) => {
  if (!connections[sessionId]) {
    return null;
  }
  
  return {
    socket: connections[sessionId].socket,
    qr: connections[sessionId].qr,
    status: connections[sessionId].state
  };
};

/**
 * Disconnect a WhatsApp session
 * @param {string} sessionId - Unique identifier for the session
 * @returns {boolean} - Success status
 */
const disconnectSession = async (sessionId) => {
  try {
    // Check if the session exists in connections object
    if (!connections[sessionId]) {
      console.log(`Session ${sessionId} not found in connections object`);
      
      // Still attempt to delete the session directory
      const sessionDir = path.join(process.cwd(), 'sessions', sessionId);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log(`Removed session directory for ${sessionId}`);
        return true;
      }
      
      return false;
    }

    // Check if socket exists before trying to logout
    if (connections[sessionId].socket) {
      try {
        // Try to log out gracefully
        await connections[sessionId].socket.logout();
      } catch (logoutError) {
        console.error(`Error during logout for ${sessionId}:`, logoutError);
        // Continue with the process even if logout fails
      }
      
      try {
        // Try to end the connection
        await connections[sessionId].socket.end();
      } catch (endError) {
        console.error(`Error ending socket for ${sessionId}:`, endError);
        // Continue with the process even if ending fails
      }
    } else {
      console.log(`Socket not found for session ${sessionId}`);
    }

    // Delete session directory
    const sessionDir = path.join(process.cwd(), 'sessions', sessionId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    // Remove from connections
    delete connections[sessionId];
    
    return true;
  } catch (error) {
    console.error(`Error disconnecting session ${sessionId}:`, error);
    return false;
  }
};

/**
 * List all active connections
 * @returns {Array} - List of session IDs
 */
const listConnections = () => {
  return Object.keys(connections).map(sessionId => ({
    id: sessionId,
    status: connections[sessionId].state
  }));
};

module.exports = {
  initializeConnection,
  getConnection,
  disconnectSession,
  listConnections
};