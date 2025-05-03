const express = require('express');
const router = express.Router();
const messageController = require('../controller/messageController');
const { messageLimiter } = require('../middleware/rateLimiter');

/**
 * @route POST /api/message/text
 * @description Send a text message
 * @access Protected
 */
router.post('/text', messageLimiter, messageController.sendTextMessage);

/**
 * @route POST /api/message/template
 * @description Send a template message
 * @access Protected
 */
router.post('/template', messageLimiter, messageController.sendTemplateMessage);

/**
 * @route POST /api/message/image
 * @description Send an image message
 * @access Protected
 */
router.post('/image', messageLimiter, messageController.sendImageMessage);

/**
 * @route POST /api/message/document
 * @description Send a document message
 * @access Protected
 */
router.post('/document', messageLimiter, messageController.sendDocumentMessage);

/**
 * @route GET /api/message/queue/:sessionId
 * @description Get message queue status
 * @access Protected
 */
router.get('/queue/:sessionId', messageController.getQueueStatus);

/**
 * @route DELETE /api/message/queue/:sessionId
 * @description Clear message queue
 * @access Protected
 */
router.delete('/queue/:sessionId', messageController.clearQueue);

/**
 * @route POST /api/message/validate
 * @description Validate a phone number
 * @access Protected
 */
router.post('/validate', messageController.validateNumber);

module.exports = router;