const messageHandler = require('./messageHandler');
const mediaHandler = require('./mediaHandler');

// Store auto-reply configurations for each session
const autoReplyConfigs = new Map();

/**
 * Auto-reply rule structure:
 * {
 *   id: string,                    // Unique identifier for this rule
 *   type: 'text' | 'pattern' | 'media', // Type of trigger
 *   trigger: string | RegExp,      // Trigger text or pattern
 *   response: {
 *     type: 'text' | 'image' | 'template', // Response type
 *     content: string | object,    // Response content
 *     options: object              // Additional options
 *   },
 *   enabled: boolean,              // Whether this rule is active
 *   matchCase: boolean,            // For text type, whether to match case
 *   probability: number            // Probability of responding (0-1)
 * }
 */

/**
 * Initialize auto-reply handler for a session
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} sessionId - Session identifier
 */
const setupAutoReply = (socket, sessionId) => {
  // Set default config if not exists
  if (!autoReplyConfigs.has(sessionId)) {
    autoReplyConfigs.set(sessionId, {
      enabled: false,
      rules: [],
      defaultResponse: null,
      respondToGroups: false,
      delay: 1000
    });
  }

  // Set up message listener
  socket.ev.on('messages.upsert', async (m) => {
    // Skip if auto-reply is disabled for this session
    const config = autoReplyConfigs.get(sessionId);
    if (!config || !config.enabled) return;

    try {
      // Process incoming messages
      const messages = m.messages || [];
      
      for (const message of messages) {
        // Skip if it's a status message or from self
        if (message.key.remoteJid === 'status@broadcast') continue;
        if (message.key.fromMe) continue;
        
        // Skip group messages if group replies are disabled
        const isGroup = message.key.remoteJid.endsWith('@g.us');
        if (isGroup && !config.respondToGroups) continue;
        
        // Get message content
        const messageContent = message.message?.conversation || 
                              message.message?.extendedTextMessage?.text || 
                              message.message?.imageMessage?.caption || 
                              message.message?.videoMessage?.caption || '';
        
        // Skip empty messages
        if (!messageContent.trim()) continue;
        
        // Match against rules
        let matchedRule = null;
        
        for (const rule of config.rules) {
          if (!rule.enabled) continue;
          
          // Apply probability filter
          if (rule.probability < 1 && Math.random() > rule.probability) continue;
          
          // Check for match based on rule type
          let isMatch = false;
          
          if (rule.type === 'text') {
            const msgText = rule.matchCase ? messageContent : messageContent.toLowerCase();
            const triggerText = rule.matchCase ? rule.trigger : rule.trigger.toLowerCase();
            isMatch = msgText === triggerText;
          } 
          else if (rule.type === 'pattern') {
            // If trigger is a string, convert to RegExp
            const pattern = rule.trigger instanceof RegExp ? 
              rule.trigger : 
              new RegExp(rule.trigger, rule.matchCase ? '' : 'i');
            
            isMatch = pattern.test(messageContent);
          }
          else if (rule.type === 'media') {
            // Check if message contains media of specified type
            isMatch = (rule.trigger === 'image' && message.message?.imageMessage) ||
                     (rule.trigger === 'video' && message.message?.videoMessage) ||
                     (rule.trigger === 'document' && message.message?.documentMessage) ||
                     (rule.trigger === 'audio' && (message.message?.audioMessage || message.message?.pttMessage));
          }
          
          if (isMatch) {
            matchedRule = rule;
            break;
          }
        }
        
        // Use default response if no rule matched but default exists
        if (!matchedRule && config.defaultResponse) {
          matchedRule = {
            id: 'default',
            response: config.defaultResponse
          };
        }
        
        // If no matching rule found, skip
        if (!matchedRule) continue;
        
        // Get sender information
        const sender = message.key.remoteJid;
        const quotedMessageId = message.key.id;
        
        // Apply delay before responding
        setTimeout(async () => {
          try {
            // Send response based on type
            const response = matchedRule.response;
            
            const responseOptions = {
              sessionId,
              quotedMessageId,
              useQueue: response.options?.useQueue ?? false,
              delay: response.options?.delay ?? 0
            };
            
            switch (response.type) {
              case 'text':
                await messageHandler.sendTextMessage(
                  socket,
                  sender,
                  response.content,
                  responseOptions
                );
                break;
                
              case 'image':
                await mediaHandler.sendImageMessage(
                  socket,
                  sender,
                  response.content.url || response.content,
                  response.content.caption || '',
                  responseOptions
                );
                break;
                
              case 'template':
                await messageHandler.sendTemplateMessage(
                  socket,
                  sender,
                  response.content,
                  responseOptions
                );
                break;
                
              // Add more response types as needed
            }
            
            console.log(`Auto-reply sent to ${sender} using rule "${matchedRule.id}"`);
          } catch (error) {
            console.error('Error sending auto-reply:', error);
          }
        }, config.delay);
      }
    } catch (error) {
      console.error('Error in auto-reply processing:', error);
    }
  });
  
  console.log(`Auto-reply handler set up for session ${sessionId}`);
  return true;
};

/**
 * Update auto-reply configuration for a session
 * @param {string} sessionId - Session identifier
 * @param {Object} config - Configuration object
 */
const updateAutoReplyConfig = (sessionId, config) => {
  const currentConfig = autoReplyConfigs.get(sessionId) || {
    enabled: false,
    rules: [],
    defaultResponse: null,
    respondToGroups: false,
    delay: 1000
  };
  
  // Update configuration
  autoReplyConfigs.set(sessionId, {
    ...currentConfig,
    ...config
  });
  
  return autoReplyConfigs.get(sessionId);
};

/**
 * Add a new auto-reply rule
 * @param {string} sessionId - Session identifier
 * @param {Object} rule - Rule definition
 */
const addAutoReplyRule = (sessionId, rule) => {
  const config = autoReplyConfigs.get(sessionId) || {
    enabled: false,
    rules: [],
    defaultResponse: null,
    respondToGroups: false,
    delay: 1000
  };
  
  // Generate ID if not provided
  if (!rule.id) {
    rule.id = `rule_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }
  
  // Add rule
  config.rules.push({
    enabled: true,
    matchCase: false,
    probability: 1,
    ...rule
  });
  
  autoReplyConfigs.set(sessionId, config);
  
  return rule;
};

/**
 * Update an existing auto-reply rule
 * @param {string} sessionId - Session identifier
 * @param {string} ruleId - Rule identifier
 * @param {Object} updates - Rule updates
 */
const updateAutoReplyRule = (sessionId, ruleId, updates) => {
  const config = autoReplyConfigs.get(sessionId);
  if (!config) return null;
  
  const ruleIndex = config.rules.findIndex(r => r.id === ruleId);
  if (ruleIndex === -1) return null;
  
  // Update rule
  config.rules[ruleIndex] = {
    ...config.rules[ruleIndex],
    ...updates
  };
  
  autoReplyConfigs.set(sessionId, config);
  
  return config.rules[ruleIndex];
};

/**
 * Delete an auto-reply rule
 * @param {string} sessionId - Session identifier
 * @param {string} ruleId - Rule identifier
 */
const deleteAutoReplyRule = (sessionId, ruleId) => {
  const config = autoReplyConfigs.get(sessionId);
  if (!config) return false;
  
  const initialLength = config.rules.length;
  config.rules = config.rules.filter(r => r.id !== ruleId);
  
  if (config.rules.length === initialLength) {
    return false;
  }
  
  autoReplyConfigs.set(sessionId, config);
  return true;
};

/**
 * Get auto-reply configuration for a session
 * @param {string} sessionId - Session identifier
 */
const getAutoReplyConfig = (sessionId) => {
  return autoReplyConfigs.get(sessionId) || {
    enabled: false,
    rules: [],
    defaultResponse: null,
    respondToGroups: false,
    delay: 1000
  };
};

module.exports = {
  setupAutoReply,
  updateAutoReplyConfig,
  addAutoReplyRule,
  updateAutoReplyRule,
  deleteAutoReplyRule,
  getAutoReplyConfig
};