const { supabaseAdmin } = require('../config/supabase');

class ReservationTimeoutService {
  /**
   * Executa a verificação e limpeza automática de timeouts de reservas:
   * 1. Timeout 48h: Reservas 'pending' há mais de 48 horas -> transita para 'expired' e reverte anúncio para 'active'.
   * 2. Timeout 7 dias: Reservas 'accepted' há mais de 7 dias sem dupla confirmação -> transita para 'expired' e reverte anúncio para 'active'.
   */
  async checkTimeouts() {
    try {
      console.log('[TIMEOUT SERVICE]: A verificar expirações automáticas de reservas (48h e 7d)...');

      // 1. Tentar executar a função atómica do PostgreSQL (que também é disparada via pg_cron)
      try {
        const { data: cronResult, error: rpcErr } = await supabaseAdmin.rpc('process_reservation_lifecycle_timeouts');
        if (!rpcErr && cronResult) {
          if (cronResult.expired_48h > 0 || cronResult.expired_7d > 0) {
            console.log(`[TIMEOUT SERVICE / DB]: Processados via RPC/pg_cron: ${cronResult.expired_48h} de 48h, ${cronResult.expired_7d} de 7d.`);
          }
          return;
        }
      } catch (e) {
        // Fallback para execução direta no Node.js se a procedure ainda não foi injetada no PostgreSQL
      }

      const now = new Date();

      // 2. Timeout 48 Horas para Reservas Pendentes (Vendedor inativo)
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const { data: pendingExpired, error: pendingErr } = await supabaseAdmin
        .from('reservations')
        .select('id, listing_id, buyer_id, seller_id, listings:listing_id(title)')
        .eq('status', 'pending')
        .lt('created_at', fortyEightHoursAgo);

      if (pendingErr) {
        console.error('[TIMEOUT SERVICE ERROR - 48h]:', pendingErr.message);
      } else if (pendingExpired && pendingExpired.length > 0) {
        for (const res of pendingExpired) {
          await supabaseAdmin
            .from('reservations')
            .update({ 
              status: 'expired', 
              cancellation_reason: 'Timeout de 48h: Vendedor não respondeu à solicitação',
              updated_at: new Date() 
            })
            .eq('id', res.id);

          await supabaseAdmin
            .from('listings')
            .update({ status: 'active', updated_at: new Date() })
            .eq('id', res.listing_id);

          // Inserir notificações de alerta no painel dos estudantes
          const itemTitle = res.listings?.title || 'Material Académico';
          await supabaseAdmin.from('notifications').insert([
            {
              user_id: res.buyer_id,
              title: 'Reserva Expirada (48h)',
              message: `O seu pedido de reserva para "${itemTitle}" expirou porque o vendedor não respondeu em 48h.`,
              type: 'reservation_expired'
            },
            {
              user_id: res.seller_id,
              title: 'Pedido de Reserva Expirado',
              message: `O pedido de reserva para "${itemTitle}" expirou por ausência de resposta em 48h. O anúncio regressou ao feed ativo.`,
              type: 'reservation_expired'
            }
          ]).catch(() => {});
        }
        console.log(`[TIMEOUT SERVICE]: ${pendingExpired.length} reservas pendentes expiradas por timeout de 48h.`);
      }

      // 3. Timeout 7 Dias para Anúncios Aceites sem Dupla Confirmação Presencial
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: acceptedExpired, error: acceptedErr } = await supabaseAdmin
        .from('reservations')
        .select('id, listing_id, buyer_id, seller_id, listings:listing_id(title)')
        .eq('status', 'accepted')
        .lt('updated_at', sevenDaysAgo);

      if (acceptedErr) {
        console.error('[TIMEOUT SERVICE ERROR - 7d]:', acceptedErr.message);
      } else if (acceptedExpired && acceptedExpired.length > 0) {
        for (const res of acceptedExpired) {
          await supabaseAdmin
            .from('reservations')
            .update({ 
              status: 'expired', 
              cancellation_reason: 'Timeout de 7 dias: Ausência de dupla confirmação presencial no campus',
              updated_at: new Date() 
            })
            .eq('id', res.id);

          await supabaseAdmin
            .from('listings')
            .update({ status: 'active', updated_at: new Date() })
            .eq('id', res.listing_id);

          const itemTitle = res.listings?.title || 'Material Académico';
          await supabaseAdmin.from('notifications').insert([
            {
              user_id: res.buyer_id,
              title: 'Reserva Expirada (7 Dias)',
              message: `A reserva para "${itemTitle}" foi cancelada automaticamente por exceder o prazo de 7 dias sem confirmação física.`,
              type: 'reservation_expired'
            },
            {
              user_id: res.seller_id,
              title: 'Anúncio Reativado no Feed',
              message: `A reserva para "${itemTitle}" expirou após 7 dias. O item está novamente visível para outros colegas.`,
              type: 'reservation_expired'
            }
          ]).catch(() => {});
        }
        console.log(`[TIMEOUT SERVICE]: ${acceptedExpired.length} reservas aceites expiradas por timeout de 7 dias.`);
      }
    } catch (err) {
      console.error('[TIMEOUT SERVICE ERROR]:', err.message);
    }
  }

  /**
   * Inicia o agendador em segundo plano
   * @param {number} intervalMs Intervalo em milissegundos (predefinição: 15 minutos)
   */
  startScheduler(intervalMs = 15 * 60 * 1000) {
    // Execução inicial
    this.checkTimeouts();

    // Loop periódico
    setInterval(() => {
      this.checkTimeouts();
    }, intervalMs);

    console.log(`[TIMEOUT SERVICE]: Agendador de expirações iniciado (Intervalo: ${intervalMs / 1000}s).`);
  }
}

module.exports = new ReservationTimeoutService();
