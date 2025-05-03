const fs = require('fs');
const path = require('path');
const whatsappService = require('./whatsapp');

/**
 * Manages multiple WhatsApp sessions
 */
class SessionManager {
  constructor() {
    this.sessionsDir = path.join(process.cwd(), 'sessions');
    this.sessions = this.loadSessions();
  }

  /**
   * Load existing sessions from the sessions directory
   * @returns {Array} - List of session IDs
   */
  loadSessions() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
      return [];
    }

    // Get all directories in sessions folder (each directory is a session)
    const sessionDirs = fs.readdirSync(this.sessionsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // Initialize connections for existing sessions
    sessionDirs.forEach(async sessionId => {
      try {
        await whatsappService.initializeConnection(sessionId);
        console.log(`Restored session: ${sessionId}`);
      } catch (error) {
        console.error(`Failed to restore session ${sessionId}:`, error);
      }
    });

    return sessionDirs;
  }

  /**
   * Create a new WhatsApp session
   * @param {string} sessionId - Unique identifier for the session
   * @returns {Promise<Object>} - Connection details
   */
  async createSession(sessionId) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Validate session ID format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(sessionId)) {
      throw new Error('Invalid session ID format. Use only letters, numbers, and underscores');
    }

    // Check if session already exists
    const existingConnection = whatsappService.getConnection(sessionId);
    if (existingConnection) {
      return existingConnection;
    }

    // Initialize new connection
    const connection = await whatsappService.initializeConnection(sessionId);
    
    if (!this.sessions.includes(sessionId)) {
      this.sessions.push(sessionId);
    }
    
    return connection;
  }

  /**
   * Get status of a specific session
   * @param {string} sessionId - Unique identifier for the session
   * @returns {Object|null} - Connection status or null if not found
   */
  getSession(sessionId) {
    return whatsappService.getConnection(sessionId);
  }

  /**
   * Delete a WhatsApp session
   * @param {string} sessionId - Unique identifier for the session
   * @returns {Promise<boolean>} - Success status
   */
  async deleteSession(sessionId) {
    const result = await whatsappService.disconnectSession(sessionId);
    
    // Remove from sessions list
    if (result) {
      this.sessions = this.sessions.filter(id => id !== sessionId);
    }
    
    return result;
  }

  /**
   * List all active sessions
   * @returns {Array} - List of session data
   */
  listSessions() {
    return whatsappService.listConnections();
  }

  /**
   * Get QR code for a session
   * @param {string} sessionId - Unique identifier for the session
   * @returns {string|null} - QR code as base64 string or null
   */
  getSessionQR(sessionId) {
    const connection = whatsappService.getConnection(sessionId);
    return connection ? connection.qr : null;
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

module.exports = sessionManager;