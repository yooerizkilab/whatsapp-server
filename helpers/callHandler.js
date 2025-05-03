/**
 * Call handling utilities for WhatsApp
 */
const messageHandler = require('./messageHandler');

/**
 * Initialize call handling for a WhatsApp session
 * @param {Object} socket - WhatsApp socket connection
 * @param {Object} options - Configuration options
 */
const setupCallHandler = (socket, options = {}) => {
  const { 
    sessionId = 'default',
    rejectCalls = true,
    rejectVideoCalls = true,
    sendReplyMessage = true,
    audioCallReplyMessage = 'Sorry, I cannot take voice calls at the moment. Please send a message instead.',
    videoCallReplyMessage = 'Sorry, I cannot take video calls at the moment. Please send a message instead.',
    delay = 1000
  } = options;

  // Set up call listener
  socket.ev.on('call', async (calls) => {
    for (const call of calls) {
      // Only process offer type events (incoming calls)
      if (call.status !== 'offer') continue;

      const isVideoCall = call.isVideo;
      const callerId = call.from;
      
      console.log(`${isVideoCall ? 'Video' : 'Audio'} call from ${callerId}`);
      
      // Check if we should reject this type of call
      if ((isVideoCall && rejectVideoCalls) || (!isVideoCall && rejectCalls)) {
        try {
          // Reject the call
          await socket.rejectCall(call.id, call.from);
          console.log(`Rejected ${isVideoCall ? 'video' : 'audio'} call from ${callerId}`);
          
          // Send reply message if enabled
          if (sendReplyMessage) {
            const message = isVideoCall ? videoCallReplyMessage : audioCallReplyMessage;
            
            // Wait a short delay before sending message
            setTimeout(async () => {
              try {
                await messageHandler.sendTextMessage(
                  socket, 
                  callerId, 
                  message,
                  { 
                    sessionId,
                    useQueue: false, // Send immediately
                    delay: 0 
                  }
                );
                console.log(`Sent auto-reply to ${callerId} after rejecting call`);
              } catch (msgError) {
                console.error('Error sending call rejection message:', msgError);
              }
            }, delay);
          }
        } catch (error) {
          console.error('Error rejecting call:', error);
        }
      } else {
        console.log(`Call not rejected (rejection not enabled for ${isVideoCall ? 'video' : 'audio'} calls)`);
      }
    }
  });
  
  console.log(`Call handler set up for session ${sessionId}`);
  return true;
};

module.exports = {
  setupCallHandler
};