const { supabaseAdmin } = require('../config/supabase');

class AdminService {
  async getStats() {
    const { data, error } = await supabaseAdmin
      .from('global_stats')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      return {
        total_users: 0,
        total_listings: 0,
        total_completed_sales: 0,
        total_saved_mzn: 0.00
      };
    }

    return data;
  }

  async getAllListings() {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*, profiles:owner_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return data || [];
  }

  async getAllUsers() {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return data || [];
  }

  async removeListing(adminId, listingId) {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .update({ status: 'removed' })
      .eq('id', listingId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Registo de auditoria interna
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'SUSPEND_LISTING',
        target_id: listingId,
        details: { title: data.title, owner_id: data.owner_id }
      });
    } catch (e) {
      console.warn('[AUDIT LOG WARNING]:', e.message);
    }

    return data;
  }

  async suspendUser(adminId, userId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'suspended', updated_at: new Date() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Ocultar todos os anúncios do utilizador suspenso
    await supabaseAdmin
      .from('listings')
      .update({ status: 'removed' })
      .eq('owner_id', userId);

    // Registo de auditoria interna
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'SUSPEND_USER',
        target_id: userId,
        details: { email: data.email, full_name: data.full_name }
      });
    } catch (e) {
      console.warn('[AUDIT LOG WARNING]:', e.message);
    }

    return data;
  }

  async getAuditLogs(adminId) {
    const { data, error } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*, admin:admin_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return [];
    return data || [];
  }
}

module.exports = new AdminService();
