const { supabaseAdmin } = require('../config/supabase');

class AdminService {
  async getStats() {
    // 1. Contagem REAL de estudantes ativos (exclui o administrador e contas suspensas)
    const { count: realUsersCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('status', 'active');

    // 2. Contagem REAL de anúncios ativos visíveis no feed público ('active' ou 'negotiating')
    const { count: realListingsCount } = await supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'negotiating']);

    // 3. Contagem REAL de transações concluídas em public.reservations
    let realCompletedCount = 0;
    try {
      const { count } = await supabaseAdmin
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed');
      realCompletedCount = count || 0;
    } catch (e) {
      console.warn('[ADMIN STATS RESERVATION COUNT WARNING]:', e.message);
    }

    // 4. Soma REAL do valor poupado em public.reservations
    let totalSavedMzn = 0;
    try {
      const { data: completedReservations } = await supabaseAdmin
        .from('reservations')
        .select('agreed_price_mzn')
        .eq('status', 'completed');

      if (completedReservations && completedReservations.length > 0) {
        totalSavedMzn = completedReservations.reduce(
          (sum, item) => sum + Number(item.agreed_price_mzn || 0),
          0
        );
      }
    } catch (e) {
      console.warn('[ADMIN STATS SAVED MZN WARNING]:', e.message);
    }

    // 5. Contagem REAL de denúncias pendentes em public.reports
    let pendingReportsCount = 0;
    try {
      const { count } = await supabaseAdmin
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      pendingReportsCount = count || 0;
    } catch (e) {
      console.warn('[ADMIN STATS REPORT WARNING]:', e.message);
    }

    return {
      total_users: realUsersCount || 0,
      total_listings: realListingsCount || 0,
      total_completed_sales: realCompletedCount,
      total_saved_mzn: Number(totalSavedMzn.toFixed(2)),
      pending_reports: pendingReportsCount
    };
  }

  async getAllListings(searchTerm = '') {
    let query = supabaseAdmin
      .from('listings')
      .select('*, profiles:owner_id(full_name, email, campus, course)')
      .order('created_at', { ascending: false });

    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query.limit(100);
    if (error) throw new Error(error.message);
    return data || [];
  }

  async getAllUsers(searchTerm = '') {
    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query.limit(100);
    if (error) throw new Error(error.message);
    return data || [];
  }

  async getReports(statusFilter = '') {
    try {
      let query = supabaseAdmin
        .from('reports')
        .select(`
          *,
          reporter:reporter_id(full_name, email),
          reported_user:reported_user_id(full_name, email),
          listing:listing_id(id, title, owner_id, status, images, price_mzn)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.limit(100);
      if (error) {
        console.warn('[GET REPORTS WARNING]:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('[GET REPORTS ERROR]:', e.message);
      return [];
    }
  }

  async createReport(reporterId, { listing_id, reported_user_id, reason, details }) {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .insert({
        reporter_id: reporterId,
        listing_id: listing_id || null,
        reported_user_id: reported_user_id || null,
        reason: reason || 'Material inadequado',
        details: details || '',
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async removeListing(adminId, listingId, reason = 'Violação dos Termos UCM') {
    // Utiliza 'removed' para respeitar a restrição (CHECK constraint "listings_status_check") da tabela listings
    const { data, error } = await supabaseAdmin
      .from('listings')
      .update({ status: 'removed', updated_at: new Date() })
      .eq('id', listingId)
      .select('*, profiles:owner_id(full_name, email)')
      .single();

    if (error) throw new Error(error.message);

    // Resolver denúncias pendentes associadas a este anúncio
    try {
      await supabaseAdmin
        .from('reports')
        .update({ status: 'resolved', updated_at: new Date() })
        .eq('listing_id', listingId);
    } catch (e) {
      console.warn('[RESOLVE REPORT WARNING]:', e.message);
    }

    // Obter email do admin para o registo de auditoria
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', adminId)
      .single();

    // Registo de auditoria imutável (admin_audit_logs)
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'SUSPEND_LISTING',
        target_id: listingId,
        details: {
          admin_email: adminProfile?.email || 'admin@ucm.ac.mz',
          title: data.title,
          owner_email: data.profiles?.email,
          reason
        }
      });
    } catch (e) {
      console.warn('[AUDIT LOG WARNING]:', e.message);
    }

    return data;
  }

  async suspendUser(adminId, userId, reason = 'Comportamento Inadequado / Fraude') {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'suspended', updated_at: new Date() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Ocultar e remover do feed todos os anúncios ativos do utilizador suspenso (usando 'removed')
    await supabaseAdmin
      .from('listings')
      .update({ status: 'removed', updated_at: new Date() })
      .eq('owner_id', userId);

    // Resolver denúncias pendentes associadas a este utilizador
    try {
      await supabaseAdmin
        .from('reports')
        .update({ status: 'resolved', updated_at: new Date() })
        .eq('reported_user_id', userId);
    } catch (e) {
      console.warn('[RESOLVE USER REPORT WARNING]:', e.message);
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', adminId)
      .single();

    // Registo de auditoria imutável
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'SUSPEND_USER',
        target_id: userId,
        details: {
          admin_email: adminProfile?.email || 'admin@ucm.ac.mz',
          user_email: data.email,
          full_name: data.full_name,
          reason
        }
      });
    } catch (e) {
      console.warn('[AUDIT LOG WARNING]:', e.message);
    }

    return data;
  }

  async reactivateUser(adminId, userId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'active', updated_at: new Date() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Reativar anúncios do utilizador que estavam removidos/suspensos
    await supabaseAdmin
      .from('listings')
      .update({ status: 'active', updated_at: new Date() })
      .eq('owner_id', userId)
      .eq('status', 'removed');

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', adminId)
      .single();

    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'REACTIVATE_USER',
        target_id: userId,
        details: {
          admin_email: adminProfile?.email || 'admin@ucm.ac.mz',
          user_email: data.email,
          full_name: data.full_name
        }
      });
    } catch (e) {
      console.warn('[AUDIT LOG WARNING]:', e.message);
    }

    return data;
  }

  async updateUserRole(adminId, userId, newRole) {
    if (!['student', 'admin'].includes(newRole)) {
      throw new Error('Cargo inválido. Escolha "student" ou "admin".');
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole, updated_at: new Date() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', adminId)
      .single();

    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'CHANGE_USER_ROLE',
        target_id: userId,
        details: {
          admin_email: adminProfile?.email || 'admin@ucm.ac.mz',
          user_email: data.email,
          user_name: data.full_name,
          new_role: newRole
        }
      });
    } catch (e) {
      console.warn('[AUDIT LOG WARNING]:', e.message);
    }

    return data;
  }

  async ignoreReport(adminId, reportId) {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .update({ status: 'ignored', updated_at: new Date() })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', adminId)
      .single();

    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'IGNORE_REPORT',
        target_id: reportId,
        details: {
          admin_email: adminProfile?.email || 'admin@ucm.ac.mz',
          report_id: reportId
        }
      });
    } catch (e) {
      console.warn('[AUDIT LOG WARNING]:', e.message);
    }

    return data;
  }

  async getAuditLogs() {
    try {
      const { data, error } = await supabaseAdmin
        .from('admin_audit_logs')
        .select('*, admin:admin_id(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) {
        console.warn('[GET AUDIT LOGS WARNING]:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      return [];
    }
  }
}

module.exports = new AdminService();
