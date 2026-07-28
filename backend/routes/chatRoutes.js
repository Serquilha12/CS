const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);
router.post('/messages', chatController.sendMessage);
router.get('/messages/:listingId/:otherUserId', chatController.getMessages);

module.exports = router;
