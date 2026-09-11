const { supabaseAdmin } = require('../config/supabase');
const socketManager = require('../websocket/socketManager');

class ChatService {
  // Validação de Integridade Académica & Moderação Ética da UCM
  checkAcademicIntegrity(text) {
    if (!text || typeof text !== 'string') return;
    const lower = text.toLowerCase();
    
    // Padrões de fraude académica e violação ética proibidos na universidade
    const forbiddenPatterns = [
      'venda de exame', 'comprar exame', 'exame vazado', 'teste vazado',
      'comprar teste', 'pagar nota', 'comprar nota', 'fraude no exame',
      'falsificar nota', 'enunciado do teste de amanha', 'enunciado do exame'
    ];

    for (const pattern of forbiddenPatterns) {
      if (lower.includes(pattern)) {
        throw new Error('A mensagem viola as normas éticas e o código de conduta académica da Universidade Católica de Moçambique.');
      }
    }
  }

  async sendMessage({ listing_id, sender_id, receiver_id, message_text }) {
    // 1. Moderação Ética Pré-Envio
    this.checkAcademicIntegrity(message_text);

    let validSenderId = sender_id;
    let validReceiverId = receiver_id;

    // 2. Garantir que o remetente (sender) existe em profiles
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', validSenderId)
      .maybeSingle();

    if (!senderProfile) {
      throw new Error('Perfil de utilizador não encontrado. Inicie sessão novamente.');
    }

    // 3. Garantir que o destinatário (receiver) existe em profiles
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

    if (!validReceiverId) {
      throw new Error('Destinatário da mensagem não identificado.');
    }

    // 4. Persistir mensagem na base de dados com cliente admin autenticado
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

    // 5. Transmitir via WebSocket em tempo real para o destinatário
    socketManager.sendPrivateMessage(validReceiverId, data);

    return data;
  }

  async getMessagesBetweenUsers(listingId, currentUserId, otherUserId, since = null) {
    let validCurrentId = currentUserId;
    let validOtherId = otherUserId;

    const { data: curP } = await supabaseAdmin.from('profiles').select('id').eq('id', validCurrentId).maybeSingle();
    if (!curP) {
      throw new Error('Perfil de utilizador não encontrado.');
    }

    const { data: othP } = await supabaseAdmin.from('profiles').select('id').eq('id', validOtherId).maybeSingle();
    if (!othP && listingId) {
      const { data: l } = await supabaseAdmin.from('listings').select('owner_id').eq('id', listingId).maybeSingle();
      if (l?.owner_id) validOtherId = l.owner_id;
    }

    let query = supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('listing_id', listingId)
      .or(`and(sender_id.eq.${validCurrentId},receiver_id.eq.${validOtherId}),and(sender_id.eq.${validOtherId},receiver_id.eq.${validCurrentId})`)
      .order('created_at', { ascending: true });

    // DELTA SYNC: Retorna apenas mensagens novas desde a última timestamp recebida
    if (since) {
      query = query.gt('created_at', since);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Marcar mensagens recebidas como lidas
    await supabaseAdmin
      .from('chat_messages')
      .update({ is_read: true })
      .eq('listing_id', listingId)
      .eq('receiver_id', validCurrentId);

    return data || [];
  }

  // CAIXA DE ENTRADA / LISTA DE CONVERSAS ATIVAS (INBOX)
  async getUserConversations(userId) {
    // 1. Obter todas as mensagens associadas a este estudante
    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*, listings:listing_id(id, title, price_mzn, status, images, transaction_type), sender:sender_id(id, full_name, email, course, avatar_url), receiver:receiver_id(id, full_name, email, course, avatar_url)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!messages || messages.length === 0) return [];

    // 2. Agrupar por listing_id + parceiro de conversa
    const conversationMap = new Map();

    for (const msg of messages) {
      const isMeSender = msg.sender_id === userId;
      const partner = isMeSender ? msg.receiver : msg.sender;
      if (!partner) continue;

      const groupKey = `${msg.listing_id}_${partner.id}`;

      if (!conversationMap.has(groupKey)) {
        conversationMap.set(groupKey, {
          listing_id: msg.listing_id,
          listing: msg.listings,
          partner_id: partner.id,
          partner: {
            id: partner.id,
            full_name: partner.full_name || 'Colega UCM',
            email: partner.email,
            course: partner.course,
            avatar_url: partner.avatar_url
          },
          last_message: {
            id: msg.id,
            text: msg.message_text,
            created_at: msg.created_at,
            sender_id: msg.sender_id,
            is_read: msg.is_read
          },
          unread_count: (!isMeSender && !msg.is_read) ? 1 : 0
        });
      } else {
        // Incrementa contagem de mensagens não lidas
        if (!isMeSender && !msg.is_read) {
          const current = conversationMap.get(groupKey);
          current.unread_count += 1;
        }
      }
    }

    return Array.from(conversationMap.values());
  }

  // Marcação em lote de leitura
  async markMessagesAsRead(listingId, currentUserId, otherUserId) {
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({ is_read: true })
      .eq('listing_id', listingId)
      .eq('receiver_id', currentUserId)
      .eq('sender_id', otherUserId)
    if (error) console.error('[MARK READ ERROR]:', error.message);
    return true;
  }

  // Apagar mensagem do chat
  async deleteMessage(messageId, userId, userRole) {
    const { data: message, error: findError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (findError || !message) {
      throw new Error('Mensagem não encontrada.');
    }

    // Apenas quem enviou a mensagem (ou um administrador) pode apagá-la
    if (message.sender_id !== userId && userRole !== 'admin') {
      const forbiddenError = new Error('Sem autorização para apagar esta mensagem.');
      forbiddenError.statusCode = 403;
      throw forbiddenError;
    }

    const { error: delError } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (delError) {
      throw new Error(delError.message);
    }

    // Notificar parceiro de conversa em tempo real via WebSocket
    socketManager.notifyMessageDeleted(message.receiver_id, messageId, message.listing_id);

    return { success: true, messageId, listingId: message.listing_id };
  }

  // Apagar deliberadamente todo o histórico de conversa entre dois utilizadores num anúncio
  async deleteConversation(listingId, currentUserId, otherUserId, userRole) {
    if (!listingId || !otherUserId) {
      throw new Error('Parâmetros listingId e otherUserId são obrigatórios.');
    }

    // Apenas participantes da conversa (ou admin) podem apagar
    let query = supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('listing_id', listingId)
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`);

    const { error: delError } = await query;
    if (delError) {
      throw new Error(delError.message);
    }

    // Notificar ambos os intervenientes via WebSocket
    socketManager.notifyConversationDeleted(currentUserId, listingId);
    socketManager.notifyConversationDeleted(otherUserId, listingId);

    return { success: true, listingId, otherUserId };
  }
}

module.exports = new ChatService();
