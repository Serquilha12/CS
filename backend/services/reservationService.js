const { supabaseAdmin } = require('../config/supabase');

class ReservationService {
  async createReservation(buyerId, { listing_id, agreed_price_mzn, meeting_point, initial_message }) {
    // 1. Verificar o anúncio
    const { data: listing, error: listErr } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .is('deleted_at', null)
      .single();

    if (listErr || !listing) throw new Error('Anúncio não encontrado ou já foi removido.');
    if (listing.owner_id === buyerId) throw new Error('Não pode reservar o seu próprio anúncio.');
    if (['sold', 'completed', 'removed', 'suspended'].includes(listing.status)) {
      throw new Error('Este anúncio já foi concluído ou não se encontra disponível.');
    }

    // 2. Verificar se este comprador já tem uma reserva ativa (pending ou accepted) para este anúncio
    const { data: existingReservation } = await supabaseAdmin
      .from('reservations')
      .select('*, listings:listing_id(title, images, price_mzn, campus_location, status), buyer:buyer_id(full_name), seller:seller_id(full_name)')
      .eq('listing_id', listing_id)
      .eq('buyer_id', buyerId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingReservation) {
      return existingReservation;
    }

    // 3. Criar a proposta de reserva para este interessado SEM alterar o status do anúncio
    // O anúncio PERMANECE 'active', permitindo concorrência saudável e múltiplos interessados
    const basePayload = {
      listing_id,
      buyer_id: buyerId,
      seller_id: listing.owner_id,
      agreed_price_mzn: agreed_price_mzn !== undefined && agreed_price_mzn !== null ? Number(agreed_price_mzn) : listing.price_mzn,
      meeting_point: meeting_point || listing.campus_location || 'Biblioteca Central - UCM Pemba',
      status: 'pending',
      buyer_confirmed: false,
      seller_confirmed: false
    };

    let reservation = null;
    const { data: createdRes, error: insertErr } = await supabaseAdmin
      .from('reservations')
      .insert(basePayload)
      .select('*, listings:listing_id(title, images, price_mzn, campus_location, status), buyer:buyer_id(full_name), seller:seller_id(full_name)')
      .single();

    if (insertErr) {
      console.error('[RESERVATION INSERT ERROR]:', insertErr);
      throw new Error('Não foi possível iniciar a negociação deste artigo.');
    }

    reservation = createdRes;

    // 4. Iniciar o chat com a mensagem do comprador
    try {
      const chatText = initial_message && initial_message.trim().length > 0
        ? `📍 Proposta de Reserva: Ponto de encontro sugerido em "${basePayload.meeting_point}".\n\nMensagem: ${initial_message.trim()}`
        : `📍 Olá! Tenho interesse em ficar com este material. Sugiro encontrarmo-nos em "${basePayload.meeting_point}".`;

      await supabaseAdmin
        .from('chat_messages')
        .insert({
          listing_id,
          sender_id: buyerId,
          receiver_id: listing.owner_id,
          message_text: chatText,
          is_read: false
        });
    } catch (chatErr) {
      console.warn('[RESERVATION INITIAL CHAT WARNING]:', chatErr.message);
    }

    return reservation;
  }

  async acceptReservation(sellerId, reservationId) {
    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('*, listings:listing_id(title, status, deleted_at)')
      .eq('id', reservationId)
      .single();

    if (!reservation) throw new Error('Reserva não encontrada.');
    if (reservation.seller_id !== sellerId) throw new Error('Apenas o vendedor pode aceitar a reserva.');

    // Bloqueio Otimista Atómico no Anúncio: Garante que o item ainda está em 'active' ou 'negotiating'
    const { data: lockedListing, error: lockErr } = await supabaseAdmin
      .from('listings')
      .update({ status: 'reserved', updated_at: new Date() })
      .eq('id', reservation.listing_id)
      .in('status', ['active', 'negotiating'])
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (lockErr || !lockedListing) {
      throw new Error('Este anúncio já se encontra reservado por outro colega ou foi vendido.');
    }

    const { data: fullUpdate, error: updateErr } = await supabaseAdmin
      .from('reservations')
      .update({ status: 'accepted', updated_at: new Date() })
      .eq('id', reservationId)
      .select('*, listings:listing_id(title)')
      .single();

    if (updateErr || !fullUpdate) {
      // Reverter se falhar
      await supabaseAdmin.from('listings').update({ status: 'active' }).eq('id', reservation.listing_id);
      throw new Error(updateErr ? updateErr.message : 'Erro ao atualizar estado da reserva.');
    }

    // Inserir mensagem de sistema no chat notificando o acordo
    try {
      await supabaseAdmin
        .from('chat_messages')
        .insert({
          listing_id: reservation.listing_id,
          sender_id: sellerId,
          receiver_id: reservation.buyer_id,
          message_text: `✅ [SISTEMA]: Reserva aceite pelo vendedor! Ponto de encontro acordado: "${reservation.meeting_point || 'Biblioteca Central'}". Por favor, compareçam no horário combinado e cliquem na confirmação após a entrega.`,
          is_read: false
        });
    } catch (e) {
      console.warn('[RESERVATION CHAT NOTICE WARNING]:', e.message);
    }

    return fullUpdate;
  }

  async confirmDouble(userId, reservationId, roleType) {
    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (!reservation) throw new Error('Reserva não encontrada.');

    const hasDoubleColumns = reservation.buyer_confirmed !== undefined;

    let updatePayload = {};
    let isDoubleConfirmed = false;

    if (hasDoubleColumns) {
      // Validação estrita de autorização (Anti-IDOR):
      // Apenas o comprador real pode confirmar como comprador e o vendedor real como vendedor
      if (reservation.buyer_id === userId) {
        updatePayload.buyer_confirmed = true;
      } else if (reservation.seller_id === userId) {
        updatePayload.seller_confirmed = true;
      } else {
        const authErr = new Error('Sem autorização para confirmar esta transação.');
        authErr.statusCode = 403;
        throw authErr;
      }

      isDoubleConfirmed =
        (updatePayload.buyer_confirmed || reservation.buyer_confirmed) &&
        (updatePayload.seller_confirmed || reservation.seller_confirmed);
    } else {
      isDoubleConfirmed = true;
    }

    if (isDoubleConfirmed) {
      updatePayload.status = 'completed';
      updatePayload.completed_at = new Date();
    }

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update(updatePayload)
      .eq('id', reservationId)
      .select('*, listings:listing_id(title)')
      .single();

    if (error) throw new Error(error.message);

    // Se ambas as partes confirmaram, fecha o anúncio como concluído e calcula poupança
    if (isDoubleConfirmed) {
      await supabaseAdmin
        .from('listings')
        .update({ status: 'completed', updated_at: new Date() })
        .eq('id', reservation.listing_id);

      const savings = Number((Number(reservation.agreed_price_mzn || 0) * 0.35).toFixed(2));

      // Atualizar perfil do comprador e estatísticas globais
      try {
        const { data: bProfile } = await supabaseAdmin
          .from('profiles')
          .select('savings_mzn, completed_deals')
          .eq('id', reservation.buyer_id)
          .maybeSingle();

        if (bProfile) {
          await supabaseAdmin
            .from('profiles')
            .update({
              savings_mzn: Number((Number(bProfile.savings_mzn || 0) + savings).toFixed(2)),
              completed_deals: (bProfile.completed_deals || 0) + 1
            })
            .eq('id', reservation.buyer_id);
        }

        // Mensagem de comemoração no chat
        await supabaseAdmin
          .from('chat_messages')
          .insert({
            listing_id: reservation.listing_id,
            sender_id: userId,
            receiver_id: userId === reservation.buyer_id ? reservation.seller_id : reservation.buyer_id,
            message_text: `🎉 [SISTEMA]: Transação concluída com sucesso por ambas as partes! O ciclo da economia circular foi encerrado com integridade. Poupança estimada gerada: ${savings} MZN.`,
            is_read: false
          });
      } catch (statErr) {
        console.warn('[RESERVATION SAVINGS UPDATE WARNING]:', statErr.message);
      }
    }

    return {
      reservation: data,
      isDoubleConfirmed
    };
  }

  async cancelReservation(userId, reservationId, cancellationReason) {
    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (!reservation) throw new Error('Reserva não encontrada.');
    if (reservation.buyer_id !== userId && reservation.seller_id !== userId) {
      throw new Error('Apenas o comprador ou vendedor pode cancelar a reserva.');
    }

    let resUpdate = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellationReason || 'Cancelamento voluntário',
        updated_at: new Date()
      })
      .eq('id', reservationId)
      .select()
      .single();

    if (resUpdate.error) {
      resUpdate = await supabaseAdmin
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservationId)
        .select()
        .single();
    }

    if (resUpdate.error) throw new Error(resUpdate.error.message);

    // Reverter o anúncio para ativo no feed
    await supabaseAdmin
      .from('listings')
      .update({ status: 'active', updated_at: new Date() })
      .eq('id', reservation.listing_id);

    // Mensagem de aviso de cancelamento no chat
    try {
      const partnerId = userId === reservation.buyer_id ? reservation.seller_id : reservation.buyer_id;
      await supabaseAdmin
        .from('chat_messages')
        .insert({
          listing_id: reservation.listing_id,
          sender_id: userId,
          receiver_id: partnerId,
          message_text: `ℹ️ [SISTEMA]: A reserva foi cancelada (${cancellationReason || 'Cancelamento voluntário'}). O artigo está novamente disponível no mercado.`,
          is_read: false
        });
    } catch (e) {
      console.warn('[RESERVATION CANCEL CHAT WARNING]:', e.message);
    }

    return resUpdate.data;
  }

  async processTimeouts() {
    try {
      const now = new Date();
      const hours48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Timeout 48h: Vendedor não respondeu ao pedido de reserva
      const { data: expired48h } = await supabaseAdmin
        .from('reservations')
        .select('id, listing_id')
        .eq('status', 'pending')
        .lt('created_at', hours48Ago);

      if (expired48h && expired48h.length > 0) {
        for (const resItem of expired48h) {
          await supabaseAdmin
            .from('reservations')
            .update({
              status: 'cancelled',
              cancellation_reason: 'Timeout de 48h: Vendedor não respondeu à solicitação',
              updated_at: new Date()
            })
            .eq('id', resItem.id);

          await supabaseAdmin
            .from('listings')
            .update({ status: 'active', updated_at: new Date() })
            .eq('id', resItem.listing_id);
        }
      }

      // 2. Timeout 7 Dias: Item reservado sem dupla confirmação de entrega
      const { data: expired7d } = await supabaseAdmin
        .from('reservations')
        .select('id, listing_id')
        .eq('status', 'accepted')
        .lt('updated_at', days7Ago);

      if (expired7d && expired7d.length > 0) {
        for (const resItem of expired7d) {
          await supabaseAdmin
            .from('reservations')
            .update({
              status: 'cancelled',
              cancellation_reason: 'Timeout de 7 dias: Ausência de dupla confirmação presencial',
              updated_at: new Date()
            })
            .eq('id', resItem.id);

          await supabaseAdmin
            .from('listings')
            .update({ status: 'active', updated_at: new Date() })
            .eq('id', resItem.listing_id);
        }
      }
    } catch (e) {
      console.warn('[RESERVATION TIMEOUT CLEANUP WARNING]:', e.message);
    }
  }

  async getReservationByListing(listingId) {
    await this.processTimeouts();

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select('*, buyer:buyer_id(full_name), seller:seller_id(full_name)')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data;
  }

  async getReservationContext(listingId, currentUserId, partnerId) {
    await this.processTimeouts();

    // 1. Obter o anúncio com seus dados completos
    const { data: listing, error: listErr } = await supabaseAdmin
      .from('listings')
      .select('id, title, price_mzn, transaction_type, status, owner_id, images, campus_location, description, condition, course, category')
      .eq('id', listingId)
      .is('deleted_at', null)
      .single();

    if (listErr || !listing) {
      return {
        listing: null,
        reservation: null,
        isAcceptedForThisChat: false,
        isReservedByOther: false,
        reservedBuyerName: null
      };
    }

    const isSeller = listing.owner_id === currentUserId;
    const currentBuyerId = isSeller ? partnerId : currentUserId;

    // 2. Verificar se existe uma reserva 'accepted' ativa no anúncio
    const { data: acceptedReservation } = await supabaseAdmin
      .from('reservations')
      .select('*, listings:listing_id(title, images, price_mzn, campus_location, status), buyer:buyer_id(full_name), seller:seller_id(full_name)')
      .eq('listing_id', listingId)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Buscar perfil do interlocutor (partner) para enriquecer o contexto do chat
    const { data: partnerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url, course')
      .eq('id', partnerId)
      .maybeSingle();

    if (acceptedReservation) {
      const isAcceptedForThisChat = acceptedReservation.buyer_id === currentBuyerId;
      return {
        listing,
        partner: partnerProfile || null,
        reservation: isAcceptedForThisChat ? acceptedReservation : null,
        isAcceptedForThisChat,
        isReservedByOther: !isAcceptedForThisChat,
        reservedBuyerName: !isAcceptedForThisChat ? (acceptedReservation.buyer?.full_name || 'outro colega') : null
      };
    }

    // 3. Se não houver reserva aceita, buscar a proposta 'pending' deste aluno específico
    const { data: pendingReservation } = await supabaseAdmin
      .from('reservations')
      .select('*, listings:listing_id(title, images, price_mzn, campus_location, status), buyer:buyer_id(full_name), seller:seller_id(full_name)')
      .eq('listing_id', listingId)
      .eq('buyer_id', currentBuyerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      listing,
      partner: partnerProfile || null,
      reservation: pendingReservation || null,
      isAcceptedForThisChat: false,
      isReservedByOther: ['reserved', 'sold', 'completed'].includes(listing.status),
      reservedBuyerName: null
    };
  }
}

module.exports = new ReservationService();
