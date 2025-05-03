const { delay } = require('@whiskeysockets/baileys');
const queueHandler = require('./queueHandler');
const messageTracker = require('./TrackerHandler');

/**
 * Send a text message to a recipient
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} recipient - Recipient phone number (with country code, without +)
 * @param {string} message - Text message to send
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Message info
 */
const sendTextMessage = async (socket, recipient, message, options = {}) => {
  try {
    // Validate recipient format
    if (!recipient.endsWith('@s.whatsapp.net')) {
      recipient = `${recipient}@s.whatsapp.net`;
    }

    // Check for duplicate message
    const sessionId = options.sessionId || 'default';
    if (!options.skipDuplicateCheck && 
        messageTracker.isDuplicateMessage(sessionId, recipient, 'text', message)) {
      console.log(`Skipping duplicate text message to ${recipient}`);
      return {
        status: true,
        message: 'Duplicate message skipped',
        skipped: true
      };
    }
    // Add message to queue
    const queueId = options.sessionId || 'default';
    if (options.useQueue !== false) {
      await queueHandler.addToQueue(queueId, {
        type: 'text',
        recipient,
        content: message,
        options
      });
      
      // If immediate sending is disabled, just return
      if (options.queueOnly === true) {
        return {
          status: true,
          message: 'Message added to queue',
          queued: true
        };
      }
    }

    // Prepare message
    const msg = {
      text: message
    };

    // Add reply quoted message if provided
    if (options.quotedMessageId) {
      msg.quoted = {
        key: {
          remoteJid: recipient,
          id: options.quotedMessageId
        }
      };
    }

    // Send message
    const sentMsg = await socket.sendMessage(recipient, msg);

    // Optional delay after sending (to prevent spam blocking)
    if (options.delay && typeof options.delay === 'number') {
      await delay(options.delay);
    }

    messageTracker.recordMessage(sessionId, recipient, 'text', message);
  
    return {
      status: true,
      message: 'Message sent successfully',
      messageInfo: sentMsg,
      recipient,
      content: message
    };

  } catch (error) {
    console.error('Error sending text message:', error);
    
    // If sending failed and retry is enabled, requeue
    if (options.retry && options.retry > 0 && options.useQueue !== false) {
      const queueId = options.sessionId || 'default';
      await queueHandler.addToQueue(queueId, {
        type: 'text',
        recipient,
        content: message,
        options: {
          ...options,
          retry: options.retry - 1
        }
      });
      
      return {
        status: false,
        message: 'Message sending failed, requeued for retry',
        error: error.message,
        queued: true
      };
    }
    
    throw error;
  }
};

/**
 * Send a template message with predefined structure
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} recipient - Recipient phone number
 * @param {Object} template - Template object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Message info
 */
const sendTemplateMessage = async (socket, recipient, template, options = {}) => {
  try {
    // Validate recipient format
    if (!recipient.endsWith('@s.whatsapp.net')) {
      recipient = `${recipient}@s.whatsapp.net`;
    }

    // Validate template structure
    if (!template || !template.header || !template.body) {
      throw new Error('Invalid template structure');
    }

    // Prepare message content
    let messageContent = '';
    
    // Add header
    if (template.header) {
      messageContent += `*${template.header}*\n\n`;
    }
    
    // Add body
    if (template.body) {
      messageContent += `${template.body}\n\n`;
    }
    
    // Add footer
    if (template.footer) {
      messageContent += `_${template.footer}_`;
    }

    // Send message using text message function
    return await sendTextMessage(socket, recipient, messageContent, options);
  } catch (error) {
    console.error('Error sending template message:', error);
    throw error;
  }
};

/**
 * Validate phone number for WhatsApp
 * @param {string} phoneNumber - Phone number to validate
 * @returns {Promise<Object>} - Validation result
 */
const validateNumber = async (socket, phoneNumber) => {
  try {
    // Remove any non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Check if number exists on WhatsApp
    const [result] = await socket.onWhatsApp(cleanNumber);
    
    if (result && result.exists) {
      return {
        status: true,
        exists: true,
        jid: result.jid,
        number: cleanNumber
      };
    } else {
      return {
        status: true,
        exists: false,
        number: cleanNumber
      };
    }
  } catch (error) {
    console.error('Error validating number:', error);
    return {
      status: false,
      error: error.message,
      number: phoneNumber
    };
  }
};

module.exports = {
  sendTextMessage,
  sendTemplateMessage,
  validateNumber
};