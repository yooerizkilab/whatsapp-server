const express = require('express');
const router = express.Router();
const statusController = require('../controller/statusController');

/**
 * @route GET /api/status/:sessionId
 * @description Get status of a specific session
 * @access Protected
 */
router.get('/:sessionId', statusController.getSessionStatus);

/**
 * @route GET /api/status
 * @description Get status of all sessions
 * @access Protected
 */
router.get('/', statusController.getAllSessionsStatus);

/**
 * @route GET /api/status/server/health
 * @description Check server health status
 * @access Protected
 */
router.get('/server/health', statusController.getServerStatus);

module.exports = router;