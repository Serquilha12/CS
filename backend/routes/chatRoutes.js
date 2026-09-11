const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { chatMessageLimiter } = require('../middlewares/rateLimiter');

router.use(authMiddleware);
router.get('/conversations', chatController.getConversations);
router.post('/messages', chatMessageLimiter, chatController.sendMessage);
router.get('/messages/:listingId/:otherUserId', chatController.getMessages);
router.put('/messages/:listingId/:otherUserId/read', chatController.markAsRead);

module.exports = router;
