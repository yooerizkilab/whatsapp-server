const express = require('express');
const router = express.Router();
const groupController = require('../controller/groupController');
const { messageLimiter } = require('../middleware/rateLimiter');

/**
 * @route POST /api/group/create
 * @description Create a new WhatsApp group
 * @access Protected
 */
router.post('/create', messageLimiter, groupController.createGroup);

/**
 * @route POST /api/group/add-participants
 * @description Add participants to a group
 * @access Protected
 */
router.post('/add-participants', messageLimiter, groupController.addGroupParticipants);

/**
 * @route POST /api/group/remove-participants
 * @description Remove participants from a group
 * @access Protected
 */
router.post('/remove-participants', messageLimiter, groupController.removeGroupParticipants);

/**
 * @route POST /api/group/message
 * @description Send a message to a group
 * @access Protected
 */
router.post('/message', messageLimiter, groupController.sendGroupMessage);

/**
 * @route GET /api/group/info/:sessionId/:groupId
 * @description Get group information
 * @access Protected
 */
router.get('/info/:sessionId/:groupId', groupController.getGroupInfo);

/**
 * @route POST /api/group/leave
 * @description Leave a group
 * @access Protected
 */
router.post('/leave', messageLimiter, groupController.leaveGroup);

/**
 * @route POST /api/group/update-subject
 * @description Update group subject (name)
 * @access Protected
 */
router.post('/update-subject', messageLimiter, groupController.updateGroupSubject);

/**
 * @route POST /api/group/update-description
 * @description Update group description
 * @access Protected
 */
router.post('/update-description', messageLimiter, groupController.updateGroupDescription);

module.exports = router;