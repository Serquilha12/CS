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
    if (listing.status === 'sold' || listing.status === 'removed') {
      throw new Error('Este anúncio já não se encontra disponível.');
    }

    // Criar a reserva
    const { data: reservation, error: resErr } = await supabaseAdmin
      .from('reservations')
      .insert({
        listing_id,
        buyer_id: buyerId,
        seller_id: listing.owner_id,
        agreed_price_mzn: agreed_price_mzn !== undefined ? agreed_price_mzn : listing.price_mzn,
        meeting_point: meeting_point || listing.campus_location || 'Biblioteca Central - UCM Pemba',
        status: 'pending',
        buyer_confirmed: false,
        seller_confirmed: false
      })
      .select('*, listings:listing_id(title, images), buyer:buyer_id(full_name), seller:seller_id(full_name)')
      .single();

    if (resErr) throw new Error(resErr.message);

    // Sinalizar o anúncio em negociação
    await supabaseAdmin
      .from('listings')
      .update({ status: 'negotiating', updated_at: new Date() })
      .eq('id', listing_id);

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

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({ status: 'accepted', updated_at: new Date() })
      .eq('id', reservationId)
      .select('*, listings:listing_id(title)')
      .single();

    if (error) throw new Error(error.message);

    // Mudar anúncio para reservado
    await supabaseAdmin
      .from('listings')
      .update({ status: 'reserved', updated_at: new Date() })
      .eq('id', reservation.listing_id);

    // Cancelar automaticamente quaisquer outros pedidos pendentes em concorrencia
    await supabaseAdmin
      .from('reservations')
      .update({ status: 'cancelled', cancellation_reason: 'Item reservado por outro colega', updated_at: new Date() })
      .eq('listing_id', reservation.listing_id)
      .eq('status', 'pending')
      .neq('id', reservationId);

    return data;
  }

  async confirmDouble(userId, reservationId, roleType) {
    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (!reservation) throw new Error('Reserva não encontrada.');

    const updatePayload = { updated_at: new Date() };

    if (reservation.buyer_id === userId || roleType === 'buyer') {
      updatePayload.buyer_confirmed = true;
    } else if (reservation.seller_id === userId || roleType === 'seller') {
      updatePayload.seller_confirmed = true;
    } else {
      throw new Error('Sem autorização para confirmar esta transação.');
    }

    const isDoubleConfirmed =
      (updatePayload.buyer_confirmed || reservation.buyer_confirmed) &&
      (updatePayload.seller_confirmed || reservation.seller_confirmed);

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
        .update({ status: 'sold', updated_at: new Date() })
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

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellationReason || 'Cancelamento voluntário',
        updated_at: new Date()
      })
      .eq('id', reservationId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Reverter o anúncio para ativo no feed
    await supabaseAdmin
      .from('listings')
      .update({ status: 'active', updated_at: new Date() })
      .eq('id', reservation.listing_id);

    return data;
  }

  async getReservationByListing(listingId) {
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
