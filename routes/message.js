const express = require('express');
const router = express.Router();
const messageController = require('../controller/messageController');
const { messageLimiter } = require('../middleware/rateLimiter');

/**
 * @route POST /api/message/text
 * @description Send a text message
 * @access Protected
 */
/**
 * @swagger
 * /message/text:
 *   post:
 *     summary: Send a text message
 *     tags:
 *       - Messages
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - to
 *               - text
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: user1
 *               to:
 *                 type: string
 *                 example: "628123456789"
 *               text:
 *                 type: string
 *                 example: "Hello, this is a test message"
 *               quotedMessageId:
 *                 type: string
 *                 example: "3EB0195D37F6"
 *               useQueue:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *               queueOnly:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *               delay:
 *                 type: integer
 *                 default: 1000
 *                 example: 1000
 *               retry:
 *                 type: integer
 *                 default: 3
 *                 example: 3
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Message sent successfully
 *                 messageInfo:
 *                   type: object
 *                 recipient:
 *                   type: string
 *                   example: "628123456789@s.whatsapp.net"
 *                 content:
 *                   type: string
 *                   example: "Hello, this is a test message"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Session ID, recipient, and message text are required
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Session not found
 */
router.post('/text', messageLimiter, messageController.sendTextMessage);

/**
 * @route POST /api/message/template
 * @description Send a template message
 * @access Protected
 */
/**
 * @swagger
 * /message/template:
 *   post:
 *     summary: Send a template message
 *     tags:
 *       - Messages
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - to
 *               - template
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: user1
 *               to:
 *                 type: string
 *                 example: "628123456789"
 *               template:
 *                 type: object
 *                 properties:
 *                   header:
 *                     type: string
 *                     example: "Company Newsletter"
 *                   body:
 *                     type: string
 *                     example: "Hello, this is our monthly newsletter.\n\nCheck out our latest products!"
 *                   footer:
 *                     type: string
 *                     example: "Sent by WhatsApp API"
 *               useQueue:
 *                 type: boolean
 *                 default: true
 *               queueOnly:
 *                 type: boolean
 *                 default: false
 *               delay:
 *                 type: integer
 *                 default: 1000
 *               retry:
 *                 type: integer
 *                 default: 3
 *     responses:
 *       200:
 *         description: Template message sent successfully
 *       400:
 *         description: Bad request
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