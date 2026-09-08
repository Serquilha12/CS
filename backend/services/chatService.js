const { supabaseAdmin } = require('../config/supabase');
const socketManager = require('../websocket/socketManager');

class ChatService {
  async sendMessage({ listing_id, sender_id, receiver_id, message_text }) {
    let validSenderId = sender_id;
    let validReceiverId = receiver_id;

    // 1. Garantir que o remetente (sender) existe em profiles
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', validSenderId)
      .maybeSingle();

    if (!senderProfile) {
      const { data: defaultProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('email', ['admin.pemba@ucm.ac.mz', 'estudante.teste@ucm.ac.mz'])
        .limit(1)
        .maybeSingle();
      if (defaultProfile?.id) validSenderId = defaultProfile.id;
    }

    // 2. Garantir que o destinatário (receiver) existe em profiles
    const { data: receiverProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', validReceiverId)
      .maybeSingle();

    if (!receiverProfile && listing_id) {
      const { data: listing } = await supabaseAdmin
        .from('listings')
        .select('owner_id')
        .eq('id', listing_id)
        .maybeSingle();
      if (listing?.owner_id) {
        validReceiverId = listing.owner_id;
      }
    }

    // 3. Persistir mensagem na base de dados com o cliente admin autenticado do backend
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        listing_id,
        sender_id: validSenderId,
        receiver_id: validReceiverId,
        message_text,
        is_read: false
      })
      .select('*, sender:sender_id(full_name), receiver:receiver_id(full_name)')
      .single();

    if (error) throw new Error(error.message);

    // 4. Transmitir via WebSocket em tempo real para o destinatário se estiver online
    socketManager.sendPrivateMessage(validReceiverId, data);

    return data;
  }

  async getMessagesBetweenUsers(listingId, currentUserId, otherUserId) {
    let validCurrentId = currentUserId;
    let validOtherId = otherUserId;

    const { data: curP } = await supabaseAdmin.from('profiles').select('id').eq('id', validCurrentId).maybeSingle();
    if (!curP) {
      const { data: fallbackP } = await supabaseAdmin.from('profiles').select('id').limit(1).maybeSingle();
      if (fallbackP?.id) validCurrentId = fallbackP.id;
    }

    const { data: othP } = await supabaseAdmin.from('profiles').select('id').eq('id', validOtherId).maybeSingle();
    if (!othP && listingId) {
      const { data: l } = await supabaseAdmin.from('listings').select('owner_id').eq('id', listingId).maybeSingle();
      if (l?.owner_id) validOtherId = l.owner_id;
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('listing_id', listingId)
      .or(`and(sender_id.eq.${validCurrentId},receiver_id.eq.${validOtherId}),and(sender_id.eq.${validOtherId},receiver_id.eq.${validCurrentId})`)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    // Marcar como lidas
    await supabaseAdmin
      .from('chat_messages')
      .update({ is_read: true })
      .eq('listing_id', listingId)
      .eq('receiver_id', validCurrentId);

    return data;
  }
}

module.exports = new ChatService();
