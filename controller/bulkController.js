const sessionManager = require('../service/sessionManager');
const bulkMessageHandler = require('../helpers/bulkHandler');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Send bulk message to multiple recipients
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendBulkMessage = async (req, res) => {
  try {
    // Get data from request body
    const {
      sessionId,
      recipients,
      message,
      campaignName,
      delay = 3000
    } = req.body;
    
    // Validate required fields
    if (!sessionId || !recipients || !message) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, recipients, and message are required'
      });
    }
    
    // Validate recipients array
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'Recipients must be a non-empty array of phone numbers'
      });
    }
    
    // Validate message
    if (!message.type || !message.content) {
      return res.status(400).json({
        status: false,
        message: 'Invalid message format. Type and content are required'
      });
    }
    
    // Get session
    const session = sessionManager.getSession(sessionId);
    
    // If session doesn't exist, return error
    if (!session) {
      return res.status(404).json({
        status: false,
        message: 'Session not found'
      });
    }
    
    // If session is not connected, return error
    if (session.status !== 'open') {
      return res.status(400).json({
        status: false,
        message: 'Session is not connected'
      });
    }
    
    // Generate campaign ID
    const campaignId = campaignName ? 
      `${campaignName.replace(/[^a-zA-Z0-9_]/g, '_')}_${Date.now()}` : 
      `campaign_${Date.now()}`;
    
    // Start bulk message campaign
    const result = await bulkMessageHandler.sendBulkMessage(
      session.socket,
      recipients,
      message,
      {
        sessionId,
        campaignId,
        delay
      }
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error sending bulk message:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to send bulk message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send personalized bulk message using template with variables
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendPersonalizedBulkMessage = async (req, res) => {
  try {
    // Get data from request body
    const {
      sessionId,
      recipients,
      messageTemplate,
      campaignName,
      delay = 3000
    } = req.body;
    
    // Validate required fields
    if (!sessionId || !recipients || !messageTemplate) {
      return res.status(400).json({
        status: false,
        message: 'Session ID, recipients, and message template are required'
      });
    }
    
    // Validate recipients array
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'Recipients must be a non-empty array of objects with number and variables'
      });
    }
    
    // Validate message template
    if (!messageTemplate.type || !messageTemplate.content) {
      return res.status(400).json({
        status: false,
        message: 'Invalid message template. Type and content are required'
      });
    }
    
    // Get session
    const session = sessionManager.getSession(sessionId);
    
    // If session doesn't exist, return error
    if (!session) {
      return res.status(404).json({
        status: false,
        message: 'Session not found'
      });
    }
    
    // If session is not connected, return error
    if (session.status !== 'open') {
      return res.status(400).json({
        status: false,
        message: 'Session is not connected'
      });
    }
    
    // Generate campaign ID
    const campaignId = campaignName ? 
      `${campaignName.replace(/[^a-zA-Z0-9_]/g, '_')}_${Date.now()}` : 
      `personalized_${Date.now()}`;
    
    // Start personalized bulk message campaign
    const result = await bulkMessageHandler.sendPersonalizedBulkMessage(
      session.socket,
      recipients,
      messageTemplate,
      {
        sessionId,
        campaignId,
        delay
      }
    );
    
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error('Error sending personalized bulk message:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to send personalized bulk message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Upload CSV file with recipients for bulk messaging
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const uploadRecipientsCSV = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: 'No file uploaded'
      });
    }
    
    // Validate file type
    if (req.file.mimetype !== 'text/csv' && !req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({
        status: false,
        message: 'Uploaded file must be a CSV'
      });
    }
    
    // Process CSV file
    const recipients = [];
    const filePath = req.file.path;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Check if the row has a "number" or "phone" field
        const phoneNumber = row.number || row.phone || row.phoneNumber || row.contact;
        
        if (phoneNumber) {
          // Extract all other columns as variables
          const variables = {};
          Object.keys(row).forEach(key => {
            if (key !== 'number' && key !== 'phone' && key !== 'phoneNumber' && key !== 'contact') {
              variables[key] = row[key];
            }
          });
          
          recipients.push({
            number: phoneNumber,
            variables
          });
        }
      })
      .on('end', () => {
        // Delete the temporary file
        fs.unlinkSync(filePath);
        
        return res.status(200).json({
          status: true,
          message: 'CSV processed successfully',
          recipients,
          count: recipients.length
        });
      })
      .on('error', (error) => {
        console.error('Error processing CSV:', error);
        return res.status(500).json({
          status: false,
          message: 'Failed to process CSV file',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      });
  } catch (error) {
    console.error('Error uploading CSV:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to upload CSV file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get campaign status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCampaignStatus = async (req, res) => {
  try {
    // Get campaign ID from request params
    const { campaignId } = req.params;
    
    // Validate campaign ID
    if (!campaignId) {
      return res.status(400).json({
        status: false,
        message: 'Campaign ID is required'
      });
    }
    
    // Get campaign
    const campaign = bulkMessageHandler.getCampaign(campaignId);
    
    // If campaign doesn't exist, return error
    if (!campaign) {
      return res.status(404).json({
        status: false,
        message: 'Campaign not found'
      });
    }
    
    return res.status(200).json({
      status: true,
      campaign: {
        id: campaign.id,
        sessionId: campaign.sessionId,
        messageType: campaign.messageType,
        totalRecipients: campaign.totalRecipients,
        processedCount: campaign.processedCount,
        successCount: campaign.successCount,
        failedCount: campaign.failedCount,
        startTime: campaign.startTime,
        endTime: campaign.endTime,
        status: campaign.status,
        progress: Math.round((campaign.processedCount / campaign.totalRecipients) * 100)
      }
    });
  } catch (error) {
    console.error('Error getting campaign status:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to get campaign status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * List campaigns for a session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const listCampaigns = async (req, res) => {
  try {
    // Get session ID from request params
    const { sessionId } = req.params;
    
    // Validate session ID
    if (!sessionId) {
      return res.status(400).json({
        status: false,
        message: 'Session ID is required'
      });
    }
    
    // Get session
    const session = sessionManager.getSession(sessionId);
    
    // If session doesn't exist, return error
    if (!session) {
      return res.status(404).json({
        status: false,
        message: 'Session not found'
      });
    }
    
    // Get campaigns
    const campaigns = bulkMessageHandler.listCampaigns(sessionId);
    
    return res.status(200).json({
      status: true,
      count: campaigns.length,
      campaigns
    });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to list campaigns',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Cancel a campaign
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cancelCampaign = async (req, res) => {
  try {
    // Get campaign ID from request body
    const { campaignId } = req.body;
    
    // Validate campaign ID
    if (!campaignId) {
      return res.status(400).json({
        status: false,
        message: 'Campaign ID is required'
      });
    }
    
    // Cancel campaign
    const result = bulkMessageHandler.cancelCampaign(campaignId);
    
    if (!result) {
      return res.status(400).json({
        status: false,
        message: 'Campaign not found or already completed'
      });
    }
    
    return res.status(200).json({
      status: true,
      message: 'Campaign cancelled successfully',
      campaignId
    });
  } catch (error) {
    console.error('Error cancelling campaign:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to cancel campaign',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  sendBulkMessage,
  sendPersonalizedBulkMessage,
  uploadRecipientsCSV,
  getCampaignStatus,
  listCampaigns,
  cancelCampaign
};