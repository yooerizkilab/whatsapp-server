const fs = require('fs-extra');
const path = require('path');
const { connectToWhatsApp, checkSessionTimeout } = require('./waClient');

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

// Function to load all existing WhatsApp sessions
const loadSessions = async (sessions) => {
  try {
    // Create sessions directory if it doesn't exist
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }

    const sessionFolders = fs.readdirSync(SESSIONS_DIR);
    console.log(`📂 Found ${sessionFolders.length} session folders`);
    
    // Process sessions sequentially to avoid multiple QR codes showing up at once
    for (const sessionId of sessionFolders) {
      // Skip hidden folders or files
      if (sessionId.startsWith('.')) continue;
      
      // Check if the folder has auth credentials before attempting to connect
      const authInfoPath = path.join(SESSIONS_DIR, sessionId, 'creds.json');
      if (!fs.existsSync(authInfoPath)) {
        console.log(`⚠️ Session ${sessionId} has no credentials file, skipping...`);
        continue;
      }
      
      try {
        console.log(`🔄 Loading session: ${sessionId}`);
        await connectToWhatsApp(sessionId, sessions);
        // Wait a moment to avoid connection collisions
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (err) {
        console.error(`❌ Failed to load session ${sessionId}:`, err);
      }
    }
    
    // Start timeout checking only if we have sessions
    if (Object.keys(sessions).length > 0) {
      console.log(`⏲️ Starting session timeout monitoring for ${Object.keys(sessions).length} sessions`);
      checkSessionTimeout(sessions);
    }
  } catch (error) {
    console.error('Error loading sessions:', error);
    throw error;
  }
};

// Function to create a new WhatsApp session
const createSession = async (sessionId, sessions) => {
  try {
    if (sessions[sessionId]) {
      console.log(`⚠️ Session ${sessionId} already exists!`);
      return sessions[sessionId]; // Return existing session
    }

    console.log(`🌐 Creating new session: ${sessionId}`);
    const socket = await connectToWhatsApp(sessionId, sessions);
    return socket;
  } catch (error) {
    console.error(`❌ Error creating session ${sessionId}:`, error);
    throw error;
  }
};

module.exports = {
  loadSessions,
  createSession,
};