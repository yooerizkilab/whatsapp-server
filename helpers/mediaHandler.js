
const { delay } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mime = require('mime-types');
const queueHandler = require('./queueHandler');
const messageTracker = require('./TrackerHandler');

/**
 * Download file from URL or convert base64 to buffer
 * @param {string} fileData - URL or base64 string
 * @returns {Promise<Object>} - File buffer and mime type
 */
const getFileBuffer = async (fileData) => {
  try {
    let buffer;
    let mimeType;

    // Check if fileData is a URL
    if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
      // Download file from URL
      const response = await axios.get(fileData, {
        responseType: 'arraybuffer'
      });
      
      buffer = Buffer.from(response.data);
      mimeType = response.headers['content-type'];
    } 
    // Check if fileData is a Base64 string
    else if (fileData.startsWith('data:')) {
      // Extract mime type and base64 data
      const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
      
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 format');
      }
      
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    }
    // Check if fileData is a file path
    else if (fs.existsSync(fileData)) {
      buffer = fs.readFileSync(fileData);
      mimeType = mime.lookup(fileData) || 'application/octet-stream';
    }
    else {
      throw new Error('Invalid file data format');
    }

    return { buffer, mimeType };
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
};

/**
 * Send an image message
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} recipient - Recipient phone number
 * @param {string} imageData - Image URL, path, or base64
 * @param {string} caption - Optional caption
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Message info
 */
const sendImageMessage = async (socket, recipient, imageData, caption = '', options = {}) => {
    try {
      // Validate recipient format
      if (!recipient.endsWith('@s.whatsapp.net')) {
        recipient = `${recipient}@s.whatsapp.net`;
      }

      // Check for duplicate message
      const sessionId = options.sessionId || 'default';
      if (!options.skipDuplicateCheck && 
          messageTracker.isDuplicateMessage(sessionId, recipient, 'image', imageData)) {
        console.log(`Skipping duplicate image message to ${recipient}`);
        return {
          status: true,
          message: 'Duplicate image message skipped',
          skipped: true
        };
      }
  
      // Add message to queue
      const queueId = options.sessionId || 'default';
      if (options.useQueue !== false) {
        await queueHandler.addToQueue(queueId, {
          type: 'image',
          recipient,
          content: imageData,
          caption,
          options
        });
        
        // If immediate sending is disabled, just return
        if (options.queueOnly === true) {
          return {
            status: true,
            message: 'Image message added to queue',
            queued: true
          };
        }
      }
  
      // Get image buffer
      const { buffer, mimeType } = await getFileBuffer(imageData);
  
      // Prepare message
      const msg = {
        image: buffer,
        caption: caption || '',
        mimetype: mimeType
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
  
      // Optional delay after sending
      if (options.delay && typeof options.delay === 'number') {
        await delay(options.delay);
      }

      // After successfully sending the image, record it
      // Add this right after the sentMsg = await socket.sendMessage(...) line:
      messageTracker.recordMessage(sessionId, recipient, 'image', imageData);
  
      return {
        status: true,
        message: 'Location sent successfully',
        messageInfo: sentMsg,
        recipient,
        coordinates: { latitude, longitude },
        name,
        address,
      };
    } catch (error) {
      console.error('Error sending location message:', error);
      
      // If sending failed and retry is enabled, requeue
      if (options.retry && options.retry > 0 && options.useQueue !== false) {
        const queueId = options.sessionId || 'default';
        await queueHandler.addToQueue(queueId, {
          type: 'location',
          recipient,
          latitude,
          longitude,
          name,
          address,
          options: {
            ...options,
            retry: options.retry - 1
          }
        });
        
        return {
          status: false,
          message: 'Location sending failed, requeued for retry',
          error: error.message,
          queued: true
        };
      }
      
      throw error;
    }
  };

  /**
 * Send a document message
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} recipient - Recipient phone number
 * @param {string} documentData - Document URL, path, or base64
 * @param {string} filename - Document filename
 * @param {string} caption - Optional caption
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Message info
 */
const sendDocumentMessage = async (socket, recipient, documentData, filename, caption = '', options = {}) => {
    try {
      // Validate recipient format
      if (!recipient.endsWith('@s.whatsapp.net')) {
        recipient = `${recipient}@s.whatsapp.net`;
      }
  
      // Add message to queue
      const queueId = options.sessionId || 'default';
      if (options.useQueue !== false) {
        await queueHandler.addToQueue(queueId, {
          type: 'document',
          recipient,
          content: documentData,
          filename,
          caption,
          options
        });
        
        // If immediate sending is disabled, just return
        if (options.queueOnly === true) {
          return {
            status: true,
            message: 'Document message added to queue',
            queued: true
          };
        }
      }
  
      // Get document buffer
      const { buffer, mimeType } = await getFileBuffer(documentData);
  
      // Ensure filename has an extension
      let finalFilename = filename;
      if (!path.extname(finalFilename)) {
        const extension = mime.extension(mimeType);
        if (extension) {
          finalFilename = `${finalFilename}.${extension}`;
        }
      }
  
      // Prepare message
      const msg = {
        document: buffer,
        mimetype: mimeType,
        fileName: finalFilename,
        caption: caption || ''
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
  
      // Optional delay after sending
      if (options.delay && typeof options.delay === 'number') {
        await delay(options.delay);
      }
  
      return {
        status: true,
        message: 'Document sent successfully',
        messageInfo: sentMsg,
        recipient,
        filename: finalFilename,
        caption
      };
    } catch (error) {
      console.error('Error sending document message:', error);
      
      // If sending failed and retry is enabled, requeue
      if (options.retry && options.retry > 0 && options.useQueue !== false) {
        const queueId = options.sessionId || 'default';
        await queueHandler.addToQueue(queueId, {
          type: 'document',
          recipient,
          content: documentData,
          filename,
          caption,
          options: {
            ...options,
            retry: options.retry - 1
          }
        });
        
        return {
          status: false,
          message: 'Document sending failed, requeued for retry',
          error: error.message,
          queued: true
        };
      }
      
      throw error;
    }
  };

  /**
 * Send audio message
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} recipient - Recipient phone number
 * @param {string} audioData - Audio URL, path, or base64
 * @param {boolean} ptt - Push to talk (voice note)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Message info
 */
const sendAudioMessage = async (socket, recipient, audioData, ptt = false, options = {}) => {
    try {
      // Validate recipient format
      if (!recipient.endsWith('@s.whatsapp.net')) {
        recipient = `${recipient}@s.whatsapp.net`;
      }
  
      // Add message to queue
      const queueId = options.sessionId || 'default';
      if (options.useQueue !== false) {
        await queueHandler.addToQueue(queueId, {
          type: 'audio',
          recipient,
          content: audioData,
          ptt,
          options
        });
        
        // If immediate sending is disabled, just return
        if (options.queueOnly === true) {
          return {
            status: true,
            message: 'Audio message added to queue',
            queued: true
          };
        }
      }
  
      // Get audio buffer
      const { buffer } = await getFileBuffer(audioData);
  
      // Prepare message
      const msg = ptt ? { audio: buffer, ptt: true } : { audio: buffer };
  
      // Send message
      const sentMsg = await socket.sendMessage(recipient, msg);
  
      // Optional delay after sending
      if (options.delay && typeof options.delay === 'number') {
        await delay(options.delay);
      }
  
      return {
        status: true,
        message: 'Audio sent successfully',
        messageInfo: sentMsg,
        recipient,
        ptt
      };
    } catch (error) {
      console.error('Error sending audio message:', error);
      
      // If sending failed and retry is enabled, requeue
      if (options.retry && options.retry > 0 && options.useQueue !== false) {
        const queueId = options.sessionId || 'default';
        await queueHandler.addToQueue(queueId, {
          type: 'audio',
          recipient,
          content: audioData,
          ptt,
          options: {
            ...options,
            retry: options.retry - 1
          }
        });
        
        return {
          status: false,
          message: 'Audio sending failed, requeued for retry',
          error: error.message,
          queued: true
        };
      }
      
      throw error;
    }
  };

  /**
 * Send location message
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} recipient - Recipient phone number
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {string} name - Optional location name
 * @param {string} address - Optional address
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Message info
 */
const sendLocationMessage = async (socket, recipient, latitude, longitude, name = '', address = '', options = {}) => {
    try {
      // Validate recipient format
      if (!recipient.endsWith('@s.whatsapp.net')) {
        recipient = `${recipient}@s.whatsapp.net`;
      }
  
      // Add message to queue
      const queueId = options.sessionId || 'default';
      if (options.useQueue !== false) {
        await queueHandler.addToQueue(queueId, {
          type: 'location',
          recipient,
          latitude,
          longitude,
          name,
          address,
          options
        });
        
        // If immediate sending is disabled, just return
        if (options.queueOnly === true) {
          return {
            status: true,
            message: 'Location message added to queue',
            queued: true
          };
        }
      }
  
      // Prepare message
      const msg = {
        location: {
          degreesLatitude: latitude,
          degreesLongitude: longitude,
          name: name || '',
          address: address || ''
        }
      };
  
      // Send message
      const sentMsg = await socket.sendMessage(recipient, msg);
  
      // Optional delay after sending
      if (options.delay && typeof options.delay === 'number') {
        await delay(options.delay);
      }
  
      return {
        status: true,
        message: 'Location sent successfully',
        messageInfo: sentMsg,
        recipient
      };
    } catch (error) {
      console.error('Error sending location message:', error);
      
      // If sending failed and retry is enabled, requeue
      if (options.retry && options.retry > 0 && options.useQueue !== false) {
        const queueId = options.sessionId || 'default';
        await queueHandler.addToQueue(queueId, {
          type: 'location',
          recipient,
          latitude,
          longitude,
          name,
          address,
          options: {
            ...options,
            retry: options.retry - 1
          }
        });
        
        return {
          status: false,
          message: 'Location sending failed, requeued for retry',
          error: error.message,
          queued: true
        };
      }
      
      throw error;
    }
  };
  
  module.exports = {
    sendImageMessage,
    sendDocumentMessage,
    sendAudioMessage,
    sendLocationMessage,
    getFileBuffer
  }; 