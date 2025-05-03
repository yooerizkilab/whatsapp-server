const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const pino = require('pino');

// Store all active connections
const connections = {};

// Create logger
const logger = pino({ level: 'silent' });

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

      // Reconnect if not logged out
      if (shouldReconnect) {
        setTimeout(() => {
          console.log(`Reconnecting ${sessionId}...`);
          initializeConnection(sessionId);
        }, 5000);
      } else {
        // If logged out, delete session files
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        
        // Remove from connections
        delete connections[sessionId];
      }
    } else if (connection === 'open') {
      console.log(`Connection established for ${sessionId}`);
      
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
  if (!connections[sessionId]) {
    return false;
  }

  // Close socket connection
  if (connections[sessionId].socket) {
    await connections[sessionId].socket.logout();
    await connections[sessionId].socket.end();
  }

  // Delete session directory
  const sessionDir = path.join(process.cwd(), 'sessions', sessionId);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }

  // Remove from connections
  delete connections[sessionId];
  
  return true;
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