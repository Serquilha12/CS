const { supabaseAdmin } = require('../config/supabase');

class ReservationService {
  async createReservation(buyerId, { listing_id, agreed_price_mzn, meeting_point }) {
    // Obter o anúncio
    const { data: listing, error: listErr } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (listErr || !listing) throw new Error('Anúncio não encontrado.');
    if (listing.owner_id === buyerId) throw new Error('Não pode reservar o seu próprio anúncio.');
    if (['reserved', 'sold', 'removed', 'suspended'].includes(listing.status)) {
      throw new Error('Este anúncio já não se encontra disponível para reserva.');
    }

    // Verificar se o comprador já tem uma reserva ativa (pending ou accepted) para este anúncio
    const { data: existingReservation } = await supabaseAdmin
      .from('reservations')
      .select('*, listings:listing_id(title, images), buyer:buyer_id(full_name), seller:seller_id(full_name)')
      .eq('listing_id', listing_id)
      .eq('buyer_id', buyerId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingReservation) {
      return existingReservation;
    }

    // Criar a reserva com fallback gracioso caso as colunas de confirmação dupla ainda não existam no Supabase
    const basePayload = {
      listing_id,
      buyer_id: buyerId,
      seller_id: listing.owner_id,
      agreed_price_mzn: agreed_price_mzn !== undefined && agreed_price_mzn !== null ? Number(agreed_price_mzn) : listing.price_mzn,
      meeting_point: meeting_point || listing.campus_location || 'Biblioteca Central - UCM Pemba',
      status: 'pending'
    };

    let reservation = null;
    const { data: fullRes, error: fullErr } = await supabaseAdmin
      .from('reservations')
      .insert({
        ...basePayload,
        buyer_confirmed: false,
        seller_confirmed: false
      })
      .select('*, listings:listing_id(title, images), buyer:buyer_id(full_name), seller:seller_id(full_name)')
      .single();

    if (!fullErr && fullRes) {
      reservation = fullRes;
    } else if (fullErr && (fullErr.message?.includes('buyer_confirmed') || fullErr.code === '42703' || fullErr.code === 'PGRST204')) {
      const { data: fallbackRes, error: fallbackErr } = await supabaseAdmin
        .from('reservations')
        .insert(basePayload)
        .select('*, listings:listing_id(title, images), buyer:buyer_id(full_name), seller:seller_id(full_name)')
        .single();

      if (fallbackErr) throw new Error(fallbackErr.message);
      reservation = fallbackRes;
    } else {
      throw new Error(fullErr.message);
    }

    // Sinalizar o anúncio em negociação apenas se estiver ativo
    if (listing.status === 'active') {
      await supabaseAdmin
        .from('listings')
        .update({ status: 'negotiating' })
        .eq('id', listing_id);
    }

    return reservation;
  }

  async acceptReservation(sellerId, reservationId) {
    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('*, listings:listing_id(status)')
      .eq('id', reservationId)
      .single();

    if (!reservation) throw new Error('Reserva não encontrada.');
    if (reservation.seller_id !== sellerId) throw new Error('Apenas o vendedor pode aceitar a reserva.');

    // Proteção de Race Condition: se o anúncio já foi reservado ou vendido
    if (reservation.listings?.status === 'reserved' || reservation.listings?.status === 'sold') {
      throw new Error('Este anúncio já foi reservado por outro colega.');
    }

    let data = null;
    const { data: fullUpdate, error: updateErr } = await supabaseAdmin
      .from('reservations')
      .update({ status: 'accepted' })
      .eq('id', reservationId)
      .select('*, listings:listing_id(title)')
      .single();

    if (!updateErr && fullUpdate) {
      data = fullUpdate;
    } else {
      throw new Error(updateErr.message);
    }

    // Mudar anúncio para reservado
    await supabaseAdmin
      .from('listings')
      .update({ status: 'reserved' })
      .eq('id', reservation.listing_id);

    // Cancelar automaticamente quaisquer outros pedidos pendentes em concorrência
    const cancelRes = await supabaseAdmin
      .from('reservations')
      .update({ status: 'cancelled', cancellation_reason: 'Item reservado por outro colega' })
      .eq('listing_id', reservation.listing_id)
      .eq('status', 'pending')
      .neq('id', reservationId);

    if (cancelRes.error) {
      await supabaseAdmin
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('listing_id', reservation.listing_id)
        .eq('status', 'pending')
        .neq('id', reservationId);
    }

    return data;
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
      if (reservation.buyer_id === userId || roleType === 'buyer') {
        updatePayload.buyer_confirmed = true;
      } else if (reservation.seller_id === userId || roleType === 'seller') {
        updatePayload.seller_confirmed = true;
      } else {
        throw new Error('Sem autorização para confirmar esta transação.');
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

    // Se ambas as partes confirmaram, fecha o anúncio como vendido
    if (isDoubleConfirmed) {
      await supabaseAdmin
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', reservation.listing_id);
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
        cancellation_reason: cancellationReason || 'Cancelamento voluntário'
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
      .update({ status: 'active' })
      .eq('id', reservation.listing_id);

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
}

module.exports = new ReservationService();
