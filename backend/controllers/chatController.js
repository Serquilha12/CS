const chatService = require('../services/chatService');

class ChatController {
  async sendMessage(req, res, next) {
    try {
      const { listing_id, receiver_id, message_text } = req.body;
      if (!message_text || !receiver_id || !listing_id) {
        return res.status(400).json({ success: false, error: 'Parâmetros de mensagem incompletos.' });
      }

      const message = await chatService.sendMessage({
        listing_id,
        sender_id: req.user.id,
        receiver_id,
        message_text
      });

      return res.status(201).json({
        success: true,
        data: message
      });
    } catch (err) {
      next(err);
    }
  }

  async getMessages(req, res, next) {
    try {
      const { listingId, otherUserId } = req.params;
      const messages = await chatService.getMessagesBetweenUsers(listingId, req.user.id, otherUserId);

      return res.status(200).json({
        success: true,
        data: messages
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChatController();
