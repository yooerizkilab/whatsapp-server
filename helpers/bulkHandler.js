const messageHandler = require('./messageHandler');
const mediaHandler = require('./mediaHandler');
const queueHandler = require('./queueHandler');
const messageTracker = require('./trackerHandler');
const fs = require('fs');
const path = require('path');

// Directory for storing bulk message campaigns
const campaignsDir = path.join(process.cwd(), 'campaigns');

// Make sure the campaigns directory exists
if (!fs.existsSync(campaignsDir)) {
  fs.mkdirSync(campaignsDir, { recursive: true });
}

/**
 * Send a bulk message to multiple recipients
 * @param {Object} socket - WhatsApp socket connection
 * @param {Array<string>} recipients - List of recipient phone numbers
 * @param {Object} messageData - Message content and type
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result
 */
const sendBulkMessage = async (socket, recipients, messageData, options = {}) => {
  try {
    const {
      sessionId = 'default',
      campaignId = `campaign_${Date.now()}`,
      delay = 3000, // Delay between messages (ms)
      useQueue = true,
      progressCallback = null
    } = options;

    // Validate message data
    if (!messageData || !messageData.type || !messageData.content) {
      throw new Error('Invalid message data. Type and content are required.');
    }

    // Validate recipients
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Recipients must be a non-empty array of phone numbers.');
    }

    // Create campaign object
    const campaign = {
      id: campaignId,
      sessionId,
      messageType: messageData.type,
      totalRecipients: recipients.length,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      startTime: Date.now(),
      endTime: null,
      status: 'processing',
      recipients: recipients.map(recipient => ({
        number: recipient,
        status: 'pending',
        sentAt: null,
        error: null
      }))
    };

    // Save initial campaign state
    saveCampaign(campaign);

    // Process each recipient
    const processRecipients = async () => {
      const updateProgress = (index, status, error = null) => {
        campaign.processedCount++;
        
        if (status === 'success') {
          campaign.successCount++;
        } else {
          campaign.failedCount++;
        }
        
        campaign.recipients[index].status = status;
        campaign.recipients[index].sentAt = Date.now();
        campaign.recipients[index].error = error;
        
        // Save campaign state
        saveCampaign(campaign);
        
        // Call progress callback if provided
        if (progressCallback && typeof progressCallback === 'function') {
          progressCallback({
            campaignId,
            processed: campaign.processedCount,
            total: campaign.totalRecipients,
            success: campaign.successCount,
            failed: campaign.failedCount
          });
        }
      };

      // Process recipients one by one with delay
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        try {
          let result;
          
          // Prepare recipient format
          let formattedRecipient = recipient;
          if (!formattedRecipient.endsWith('@s.whatsapp.net')) {
            formattedRecipient = `${formattedRecipient}@s.whatsapp.net`;
          }
          
          // Send message based on type
          switch (messageData.type) {
            case 'text':
              result = await messageHandler.sendTextMessage(
                socket,
                formattedRecipient,
                messageData.content,
                {
                  sessionId,
                  useQueue,
                  // skipDuplicateCheck: true,
                  delay: 0 // No delay after individual message
                }
              );
              break;
              
            case 'template':
              result = await messageHandler.sendTemplateMessage(
                socket,
                formattedRecipient,
                messageData.content,
                {
                  sessionId,
                  useQueue,
                  // skipDuplicateCheck: true,
                  delay: 0
                }
              );
              break;
              
            case 'image':
              result = await mediaHandler.sendImageMessage(
                socket,
                formattedRecipient,
                messageData.content.url || messageData.content,
                messageData.content.caption || '',
                {
                  sessionId,
                  useQueue,
                  skipDuplicateCheck: true,
                  delay: 0
                }
              );
              break;
              
            case 'document':
              result = await mediaHandler.sendDocumentMessage(
                socket,
                formattedRecipient,
                messageData.content.url || messageData.content,
                messageData.content.filename || 'document',
                messageData.content.caption || '',
                {
                  sessionId,
                  useQueue,
                  // skipDuplicateCheck: true,
                  delay: 0
                }
              );
              break;
              
            default:
              throw new Error(`Unsupported message type: ${messageData.type}`);
          }
          
          updateProgress(i, 'success');
        } catch (error) {
          console.error(`Error sending bulk message to ${recipient}:`, error);
          updateProgress(i, 'failed', error.message);
        }
        
        // Add delay between messages
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Update campaign status to completed
      campaign.status = 'completed';
      campaign.endTime = Date.now();
      saveCampaign(campaign);
      
      return {
        campaignId,
        total: campaign.totalRecipients,
        success: campaign.successCount,
        failed: campaign.failedCount,
        status: campaign.status
      };
    };

    // Start processing in the background
    processRecipients().catch(error => {
      console.error(`Error in bulk message campaign ${campaignId}:`, error);
      
      // Update campaign status to failed
      campaign.status = 'failed';
      campaign.endTime = Date.now();
      saveCampaign(campaign);
    });

    // Return initial status
    return {
      status: true,
      message: 'Bulk message campaign started',
      campaignId,
      totalRecipients: recipients.length
    };
  } catch (error) {
    console.error('Error starting bulk message campaign:', error);
    throw error;
  }
};

/**
 * Save campaign data to file
 * @param {Object} campaign - Campaign data
 */
const saveCampaign = (campaign) => {
  const filePath = path.join(campaignsDir, `${campaign.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(campaign, null, 2));
};

/**
 * Get campaign data
 * @param {string} campaignId - Campaign identifier
 * @returns {Object|null} - Campaign data or null if not found
 */
const getCampaign = (campaignId) => {
  const filePath = path.join(campaignsDir, `${campaignId}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading campaign file ${campaignId}:`, error);
    return null;
  }
};

/**
 * List all campaigns for a session
 * @param {string} sessionId - Session identifier
 * @returns {Array<Object>} - List of campaigns
 */
const listCampaigns = (sessionId) => {
  try {
    const files = fs.readdirSync(campaignsDir);
    const campaigns = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const data = fs.readFileSync(path.join(campaignsDir, file), 'utf8');
        const campaign = JSON.parse(data);
        
        if (campaign.sessionId === sessionId) {
          // Include basic info only
          campaigns.push({
            id: campaign.id,
            messageType: campaign.messageType,
            totalRecipients: campaign.totalRecipients,
            successCount: campaign.successCount,
            failedCount: campaign.failedCount,
            startTime: campaign.startTime,
            endTime: campaign.endTime,
            status: campaign.status
          });
        }
      } catch (error) {
        console.error(`Error parsing campaign file ${file}:`, error);
      }
    }
    
    return campaigns;
  } catch (error) {
    console.error(`Error listing campaigns for session ${sessionId}:`, error);
    return [];
  }
};

/**
 * Send a personalized bulk message to multiple recipients
 * @param {Object} socket - WhatsApp socket connection
 * @param {Array<Object>} recipients - List of recipient objects with personalization
 * @param {Object} messageTemplate - Message template with placeholders
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result
 */
const sendPersonalizedBulkMessage = async (socket, recipients, messageTemplate, options = {}) => {
  try {
    const {
      sessionId = 'default',
      campaignId = `personalized_${Date.now()}`,
      delay = 3000,
      useQueue = true,
      progressCallback = null
    } = options;

    // Validate message template
    if (!messageTemplate || !messageTemplate.type || !messageTemplate.content) {
      throw new Error('Invalid message template. Type and content are required.');
    }

    // Validate recipients
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Recipients must be a non-empty array of objects.');
    }

    // Create campaign object
    const campaign = {
      id: campaignId,
      sessionId,
      messageType: `personalized_${messageTemplate.type}`,
      totalRecipients: recipients.length,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      startTime: Date.now(),
      endTime: null,
      status: 'processing',
      recipients: recipients.map(recipient => ({
        number: recipient.number,
        variables: recipient.variables || {},
        status: 'pending',
        sentAt: null,
        error: null
      }))
    };

    // Save initial campaign state
    saveCampaign(campaign);

    // Process each recipient with personalization
    const processRecipients = async () => {
      const updateProgress = (index, status, error = null) => {
        campaign.processedCount++;
        
        if (status === 'success') {
          campaign.successCount++;
        } else {
          campaign.failedCount++;
        }
        
        campaign.recipients[index].status = status;
        campaign.recipients[index].sentAt = Date.now();
        campaign.recipients[index].error = error;
        
        // Save campaign state
        saveCampaign(campaign);
        
        // Call progress callback if provided
        if (progressCallback && typeof progressCallback === 'function') {
          progressCallback({
            campaignId,
            processed: campaign.processedCount,
            total: campaign.totalRecipients,
            success: campaign.successCount,
            failed: campaign.failedCount
          });
        }
      };

      // Process recipients one by one with delay
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        try {
          // Prepare recipient format
          let formattedRecipient = recipient.number;
          if (!formattedRecipient.endsWith('@s.whatsapp.net')) {
            formattedRecipient = `${formattedRecipient}@s.whatsapp.net`;
          }
          
          // Replace placeholders with personalized values
          const personalizeContent = (content) => {
            if (typeof content === 'string') {
              let personalizedContent = content;
              
              // Replace all {{variable}} placeholders
              if (recipient.variables) {
                for (const [key, value] of Object.entries(recipient.variables)) {
                  const placeholder = `{{${key}}}`;
                  personalizedContent = personalizedContent.split(placeholder).join(value);
                }
              }
              
              return personalizedContent;
            } else if (typeof content === 'object') {
              // Handle nested objects (like templates)
              const personalizedObject = {};
              
              for (const [key, value] of Object.entries(content)) {
                personalizedObject[key] = typeof value === 'string' ? 
                  personalizeContent(value) : value;
              }
              
              return personalizedObject;
            }
            
            return content;
          };
          
          // Create personalized message
          const personalizedMessage = {
            type: messageTemplate.type,
            content: personalizeContent(messageTemplate.content)
          };
          
          // Send message based on type
          let result;
          switch (personalizedMessage.type) {
            case 'text':
              result = await messageHandler.sendTextMessage(
                socket,
                formattedRecipient,
                personalizedMessage.content,
                {
                  sessionId,
                  useQueue,
                  skipDuplicateCheck: true,
                  delay: 0
                }
              );
              break;
              
            case 'template':
              result = await messageHandler.sendTemplateMessage(
                socket,
                formattedRecipient,
                personalizedMessage.content,
                {
                  sessionId,
                  useQueue,
                  skipDuplicateCheck: true,
                  delay: 0
                }
              );
              break;
              
            // Handle other message types similarly...
            
            default:
              throw new Error(`Unsupported message type: ${personalizedMessage.type}`);
          }
          
          updateProgress(i, 'success');
        } catch (error) {
          console.error(`Error sending personalized message to ${recipient.number}:`, error);
          updateProgress(i, 'failed', error.message);
        }
        
        // Add delay between messages to avoid blocking
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Update campaign status to completed
      campaign.status = 'completed';
      campaign.endTime = Date.now();
      saveCampaign(campaign);
      
      return {
        campaignId,
        total: campaign.totalRecipients,
        success: campaign.successCount,
        failed: campaign.failedCount,
        status: campaign.status
      };
    };

    // Start processing in the background
    processRecipients().catch(error => {
      console.error(`Error in personalized bulk campaign ${campaignId}:`, error);
      
      // Update campaign status to failed
      campaign.status = 'failed';
      campaign.endTime = Date.now();
      saveCampaign(campaign);
    });

    // Return initial status
    return {
      status: true,
      message: 'Personalized bulk message campaign started',
      campaignId,
      totalRecipients: recipients.length
    };
  } catch (error) {
    console.error('Error starting personalized bulk campaign:', error);
    throw error;
  }
};

/**
 * Cancel an ongoing campaign
 * @param {string} campaignId - Campaign identifier
 * @returns {boolean} - Success status
 */
const cancelCampaign = (campaignId) => {
  const campaign = getCampaign(campaignId);
  
  if (!campaign) {
    return false;
  }
  
  if (campaign.status !== 'processing') {
    return false;
  }
  
  // Mark campaign as cancelled
  campaign.status = 'cancelled';
  campaign.endTime = Date.now();
  saveCampaign(campaign);
  
  return true;
};

module.exports = {
  sendBulkMessage,
  sendPersonalizedBulkMessage,
  getCampaign,
  listCampaigns,
  cancelCampaign
};