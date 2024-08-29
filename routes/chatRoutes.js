const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

// Add this line to debug
console.log('chatController:', chatController);
router.get('/:communityId', authMiddleware, chatController.getChatMessages);
router.post('/:communityId', authMiddleware, chatController.createChatMessage);
router.delete('/:messageId', authMiddleware, chatController.deleteMessage);

module.exports = router;
