const express = require('express');
const router = express.Router();
const callController = require('../controller/callController');

/**
 * @route POST /api/call/settings
 * @description Update call handling settings
 * @access Protected
 */
router.post('/settings', callController.updateCallSettings);

module.exports = router;