const express = require('express');
const router = express.Router();
const multer = require('multer');
const bulkMessageController = require('../controller/bulkController');
const { messageLimiter } = require('../middleware/rateLimiter');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

/**
 * @route POST /api/bulk-message/send
 * @description Send a bulk message to multiple recipients
 * @access Protected
 */
router.post('/send', messageLimiter, bulkMessageController.sendBulkMessage);

/**
 * @route POST /api/bulk-message/send-personalized
 * @description Send a personalized bulk message using templates with variables
 * @access Protected
 */
router.post('/send-personalized', messageLimiter, bulkMessageController.sendPersonalizedBulkMessage);

/**
 * @route POST /api/bulk-message/upload-csv
 * @description Upload a CSV file with recipients for bulk messaging
 * @access Protected
 */
router.post('/upload-csv', upload.single('file'), bulkMessageController.uploadRecipientsCSV);

/**
 * @route GET /api/bulk-message/campaign/:campaignId
 * @description Get status of a specific campaign
 * @access Protected
 */
router.get('/campaign/:campaignId', bulkMessageController.getCampaignStatus);

/**
 * @route GET /api/bulk-message/campaigns/:sessionId
 * @description List all campaigns for a session
 * @access Protected
 */
router.get('/campaigns/:sessionId', bulkMessageController.listCampaigns);

/**
 * @route POST /api/bulk-message/cancel
 * @description Cancel an ongoing campaign
 * @access Protected
 */
router.post('/cancel', bulkMessageController.cancelCampaign);

module.exports = router;