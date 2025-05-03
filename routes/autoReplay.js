const express = require('express');
const router = express.Router();
const autoReplyController = require('../controller/autoReplayController');

/**
 * @route GET /api/auto-reply/:sessionId
 * @description Get auto-reply configuration for a session
 * @access Protected
 */
router.get('/:sessionId', autoReplyController.getAutoReplyConfig);

/**
 * @route POST /api/auto-reply/config
 * @description Update auto-reply configuration
 * @access Protected
 */
router.post('/config', autoReplyController.updateAutoReplyConfig);

/**
 * @route POST /api/auto-reply/rule
 * @description Add a new auto-reply rule
 * @access Protected
 */
router.post('/rule', autoReplyController.addAutoReplyRule);

/**
 * @route PUT /api/auto-reply/rule
 * @description Update an existing auto-reply rule
 * @access Protected
 */
router.put('/rule', autoReplyController.updateAutoReplyRule);

/**
 * @route DELETE /api/auto-reply/:sessionId/:ruleId
 * @description Delete an auto-reply rule
 * @access Protected
 */
router.delete('/:sessionId/:ruleId', autoReplyController.deleteAutoReplyRule);

module.exports = router;