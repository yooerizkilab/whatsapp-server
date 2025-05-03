const express = require('express');
const router = express.Router();
const sessionController = require('../controller/sessionController');
const { sessionLimiter } = require('../middleware/rateLimiter');

/**
 * @route POST /api/session
 * @description Create a new WhatsApp session
 * @access Public (with API key auth for protected routes)
 */
router.post('/', sessionLimiter, sessionController.createSession);

/**
 * @route GET /api/session/:sessionId
 * @description Get status of a specific session
 * @access Public (with API key auth for protected routes)
 */
router.get('/:sessionId', sessionController.getSession);

/**
 * @route DELETE /api/session/:sessionId
 * @description Delete a session and disconnect
 * @access Public (with API key auth for protected routes)
 */
router.delete('/:sessionId', sessionLimiter, sessionController.deleteSession);

/**
 * @route GET /api/session/qr/:sessionId
 * @description Get QR code for a session
 * @access Public (with API key auth for protected routes)
 */
router.get('/qr/:sessionId', sessionController.getSessionQR);

/**
 * @route GET /api/session/list
 * @description List all active sessions
 * @access Public (with API key auth for protected routes)
 */
router.get('/list/all', sessionController.listSessions);

module.exports = router;