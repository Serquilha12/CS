const { supabase } = require('../config/supabase');
const socketManager = require('../websocket/socketManager');

class ChatService {
  async sendMessage({ listing_id, sender_id, receiver_id, message_text }) {
    // 1. Persistir mensagem na base de dados
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        listing_id,
        sender_id,
        receiver_id,
        message_text,
        is_read: false
      })
      .select('*, sender:sender_id(full_name), receiver:receiver_id(full_name)')
      .single();

    if (error) throw new Error(error.message);

    // 2. Transmitir via WebSocket em tempo real para o destinatário se estiver online
    socketManager.sendPrivateMessage(receiver_id, data);

    return data;
  }

  async getMessagesBetweenUsers(listingId, currentUserId, otherUserId) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('listing_id', listingId)
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    // Marcar como lidas
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('listing_id', listingId)
      .eq('receiver_id', currentUserId);

    return data;
  }
}

module.exports = new ChatService();
