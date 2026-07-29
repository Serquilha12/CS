const { supabaseAdmin } = require('../config/supabase');

class ReservationTimeoutService {
  /**
   * Executa a verificação e limpeza automática de timeouts de reservas:
   * 1. Timeout 48h: Reservas 'pending' há mais de 48 horas -> transita para 'expired' e reverte anúncio para 'active'.
   * 2. Timeout 7 dias: Reservas 'accepted' há mais de 7 dias sem dupla confirmação -> transita para 'expired' e reverte anúncio para 'active'.
   */
  async checkTimeouts() {
    try {
      console.log('[TIMEOUT SERVICE]: A verificar expirações automáticas de reservas...');
      const now = new Date();

      // 1. Timeout 48 Horas para Reservas Pendentes
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const { data: pendingExpired, error: pendingErr } = await supabaseAdmin
        .from('reservations')
        .select('id, listing_id')
        .eq('status', 'pending')
        .lt('created_at', fortyEightHoursAgo);

      if (pendingErr) {
        console.error('[TIMEOUT SERVICE ERROR - 48h]:', pendingErr.message);
      } else if (pendingExpired && pendingExpired.length > 0) {
        for (const res of pendingExpired) {
          await supabaseAdmin
            .from('reservations')
            .update({ status: 'expired', updated_at: new Date() })
            .eq('id', res.id);

          // Reverter estado do anúncio para 'active'
          await supabaseAdmin
            .from('listings')
            .update({ status: 'active', updated_at: new Date() })
            .eq('id', res.listing_id);
        }
        console.log(`[TIMEOUT SERVICE]: ${pendingExpired.length} reservas pendentes expiradas por timeout de 48h.`);
      }

      // 2. Timeout 7 Dias para Anúncios Reservados sem Dupla Confirmação
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: acceptedExpired, error: acceptedErr } = await supabaseAdmin
        .from('reservations')
        .select('id, listing_id')
        .eq('status', 'accepted')
        .lt('updated_at', sevenDaysAgo);

      if (acceptedErr) {
        console.error('[TIMEOUT SERVICE ERROR - 7d]:', acceptedErr.message);
      } else if (acceptedExpired && acceptedExpired.length > 0) {
        for (const res of acceptedExpired) {
          await supabaseAdmin
            .from('reservations')
            .update({ status: 'expired', updated_at: new Date() })
            .eq('id', res.id);

          // Reverter estado do anúncio para 'active'
          await supabaseAdmin
            .from('listings')
            .update({ status: 'active', updated_at: new Date() })
            .eq('id', res.listing_id);
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
