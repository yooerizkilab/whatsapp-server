const { delay } = require('@whiskeysockets/baileys');
const queueHandler = require('./queueHandler');
const messageHandler = require('./messageHandler');

/**
 * Create a new WhatsApp group
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} groupName - Name of the group
 * @param {Array<string>} participants - List of phone numbers to add
 * @param {string} description - Optional group description
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Group info
 */
const createGroup = async (socket, groupName, participants, description = '', options = {}) => {
  try {
    // Validate participant numbers and format them
    const formattedParticipants = participants.map(p => {
      if (!p.endsWith('@s.whatsapp.net')) {
        return `${p}@s.whatsapp.net`;
      }
      return p;
    });

    // Create the group
    const group = await socket.groupCreate(groupName, formattedParticipants);

    // Set group description if provided
    if (description && group.id) {
      await socket.groupUpdateDescription(group.id, description);
    }

    // Optional delay after creation
    if (options.delay && typeof options.delay === 'number') {
      await delay(options.delay);
    }

    return {
      status: true,
      message: 'Group created successfully',
      groupInfo: group,
      participants: formattedParticipants.length
    };
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

/**
 * Add participants to a WhatsApp group
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} groupId - Group ID
 * @param {Array<string>} participants - List of phone numbers to add
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result
 */
const addGroupParticipants = async (socket, groupId, participants, options = {}) => {
  try {
    // Validate group ID format
    if (!groupId.endsWith('@g.us')) {
      groupId = `${groupId}@g.us`;
    }

    // Validate participant numbers and format them
    const formattedParticipants = participants.map(p => {
      if (!p.endsWith('@s.whatsapp.net')) {
        return `${p}@s.whatsapp.net`;
      }
      return p;
    });

    // Add participants to the group
    const result = await socket.groupParticipantsUpdate(
      groupId,
      formattedParticipants,
      'add'
    );

    // Optional delay after adding
    if (options.delay && typeof options.delay === 'number') {
      await delay(options.delay);
    }

    return {
      status: true,
      message: 'Participants added successfully',
      result,
      added: formattedParticipants.length
    };
  } catch (error) {
    console.error('Error adding group participants:', error);
    throw error;
  }
};

/**
 * Remove participants from a WhatsApp group
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} groupId - Group ID
 * @param {Array<string>} participants - List of phone numbers to remove
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result
 */
const removeGroupParticipants = async (socket, groupId, participants, options = {}) => {
  try {
    // Validate group ID format
    if (!groupId.endsWith('@g.us')) {
      groupId = `${groupId}@g.us`;
    }

    // Validate participant numbers and format them
    const formattedParticipants = participants.map(p => {
      if (!p.endsWith('@s.whatsapp.net')) {
        return `${p}@s.whatsapp.net`;
      }
      return p;
    });

    // Remove participants from the group
    const result = await socket.groupParticipantsUpdate(
      groupId,
      formattedParticipants,
      'remove'
    );

    // Optional delay after removing
    if (options.delay && typeof options.delay === 'number') {
      await delay(options.delay);
    }

    return {
      status: true,
      message: 'Participants removed successfully',
      result,
      removed: formattedParticipants.length
    };
  } catch (error) {
    console.error('Error removing group participants:', error);
    throw error;
  }
};

/**
 * Send a message to a WhatsApp group
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} groupId - Group ID
 * @param {string} message - Text message to send
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Message info
 */
const sendGroupMessage = async (socket, groupId, message, options = {}) => {
  try {
    // Validate group ID format
    if (!groupId.endsWith('@g.us')) {
      groupId = `${groupId}@g.us`;
    }

    // Add message to queue
    const queueId = options.sessionId || 'default';
    if (options.useQueue !== false) {
      await queueHandler.addToQueue(queueId, {
        type: 'group-message',
        groupId,
        content: message,
        options
      });
      
      // If immediate sending is disabled, just return
      if (options.queueOnly === true) {
        return {
          status: true,
          message: 'Group message added to queue',
          queued: true
        };
      }
    }

    // Send message using the message handler
    const result = await messageHandler.sendTextMessage(
      socket,
      groupId,
      message,
      { ...options, useQueue: false }
    );

    return {
      status: true,
      message: 'Group message sent successfully',
      messageInfo: result.messageInfo,
      groupId,
      content: message
    };
  } catch (error) {
    console.error('Error sending group message:', error);
    
    // If sending failed and retry is enabled, requeue
    if (options.retry && options.retry > 0 && options.useQueue !== false) {
      const queueId = options.sessionId || 'default';
      await queueHandler.addToQueue(queueId, {
        type: 'group-message',
        groupId,
        content: message,
        options: {
          ...options,
          retry: options.retry - 1
        }
      });
      
      return {
        status: false,
        message: 'Group message sending failed, requeued for retry',
        error: error.message,
        queued: true
      };
    }
    
    throw error;
  }
};

/**
 * Get information about a WhatsApp group
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} - Group info
 */
const getGroupInfo = async (socket, groupId) => {
  try {
    // Validate group ID format
    if (!groupId.endsWith('@g.us')) {
      groupId = `${groupId}@g.us`;
    }

    // Get group metadata
    const metadata = await socket.groupMetadata(groupId);

    return {
      status: true,
      group: {
        id: metadata.id,
        subject: metadata.subject,
        description: metadata.desc,
        owner: metadata.owner,
        creation: metadata.creation,
        participants: metadata.participants.map(p => ({
          id: p.id,
          isAdmin: p.admin ? true : false
        })),
        participantsCount: metadata.participants.length
      }
    };
  } catch (error) {
    console.error('Error getting group info:', error);
    throw error;
  }
};

/**
 * Leave a WhatsApp group
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} - Result
 */
const leaveGroup = async (socket, groupId) => {
  try {
    // Validate group ID format
    if (!groupId.endsWith('@g.us')) {
      groupId = `${groupId}@g.us`;
    }

    // Get own JID (phone number)
    const { user } = socket.authState.creds;
    const ownJid = `${user.id}@s.whatsapp.net`;

    // Leave the group
    await socket.groupParticipantsUpdate(
      groupId,
      [ownJid],
      'remove'
    );

    return {
      status: true,
      message: 'Left group successfully',
      groupId
    };
  } catch (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
};

/**
 * Update group subject (name)
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} groupId - Group ID
 * @param {string} subject - New group name
 * @returns {Promise<Object>} - Result
 */
const updateGroupSubject = async (socket, groupId, subject) => {
  try {
    // Validate group ID format
    if (!groupId.endsWith('@g.us')) {
      groupId = `${groupId}@g.us`;
    }

    // Update group subject
    await socket.groupUpdateSubject(groupId, subject);

    return {
      status: true,
      message: 'Group subject updated successfully',
      groupId,
      subject
    };
  } catch (error) {
    console.error('Error updating group subject:', error);
    throw error;
  }
};

/**
 * Update group description
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} groupId - Group ID
 * @param {string} description - New group description
 * @returns {Promise<Object>} - Result
 */
const updateGroupDescription = async (socket, groupId, description) => {
  try {
    // Validate group ID format
    if (!groupId.endsWith('@g.us')) {
      groupId = `${groupId}@g.us`;
    }

    // Update group description
    await socket.groupUpdateDescription(groupId, description);

    return {
      status: true,
      message: 'Group description updated successfully',
      groupId,
      description
    };
  } catch (error) {
    console.error('Error updating group description:', error);
    throw error;
  }
};

module.exports = {
  createGroup,
  addGroupParticipants,
  removeGroupParticipants,
  sendGroupMessage,
  getGroupInfo,
  leaveGroup,
  updateGroupSubject,
  updateGroupDescription
};