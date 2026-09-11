const { supabase, supabaseAdmin } = require('../config/supabase');
const { isAdminEmail } = require('../config/constants');
const socketManager = require('../websocket/socketManager');

class ListingService {
  async createListing(userId, listingData) {
    // 1. Garantir que o perfil existe em public.profiles
    try {
      const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userAuth?.user) {
        const userRole = userAuth.user.user_metadata?.role || (isAdminEmail(userAuth.user.email) ? 'admin' : 'student');
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          email: userAuth.user.email,
          full_name: userAuth.user.user_metadata?.full_name || 'Estudante UCM',
          course: userAuth.user.user_metadata?.course || listingData.course || 'Licenciatura em Tecnologias da Informação',
          campus: userAuth.user.user_metadata?.campus || 'Campus de Pemba',
          role: userRole
        });
      }
    } catch (e) {
      console.warn('[LISTING SERVICE WARNING]:', e.message);
    }

    // 2. Prevenção de Dupla Submissão por Conexão Lenta (30 segundos)
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: recentDuplicates } = await supabaseAdmin
      .from('listings')
      .select('id')
      .eq('owner_id', userId)
      .eq('title', listingData.title)
      .eq('price_mzn', listingData.price_mzn)
      .gte('created_at', thirtySecondsAgo);

    if (recentDuplicates && recentDuplicates.length > 0) {
      throw new Error('Publicação duplicada detetada. O seu anúncio já foi submetido com sucesso.');
    }

    // 3. Inserir anúncio com cliente Admin autenticado pelo backend
    const { data, error } = await supabaseAdmin
      .from('listings')
      .insert({
        owner_id: userId,
        ...listingData,
        status: 'active'
      })
      .select('*, profiles:owner_id(full_name, email, campus)')
      .single();

    if (error) throw new Error(error.message);

    socketManager.broadcastCourseAlert(data.course, data);
    return data;
  }

  async getListings({ category, course, search, cursor, page, limit = 20 }) {
    const numericLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    // Estratégia de Paginação por Cursor (B-Tree de alta performance e sem duplicados)
    if (cursor) {
      let cursorTimestamp = null;
      let cursorId = null;

      try {
        if (cursor.includes('_')) {
          const parts = cursor.split('_');
          cursorTimestamp = parts[0];
          cursorId = parts[1];
        } else {
          // Se for passado diretamente o ID do item anterior
          const { data: anchorItem } = await supabaseAdmin
            .from('listings')
            .select('created_at, id')
            .eq('id', cursor)
            .single();

          if (anchorItem) {
            cursorTimestamp = anchorItem.created_at;
            cursorId = anchorItem.id;
          }
        }
      } catch (e) {
        // Se falhar o parse do cursor, ignora
      }

      let query = supabaseAdmin
        .from('listings')
        .select('*, profiles:owner_id(full_name, campus)')
        .is('deleted_at', null)
        .in('status', ['active', 'negotiating'])
        .order('created_at', { ascending: false })
        .limit(numericLimit + 1);

      if (cursorTimestamp) {
        query = query.lt('created_at', cursorTimestamp);
      }
      if (category) query = query.eq('category', category);
      if (course) query = query.eq('course', course);
      if (search) query = query.ilike('title', `%${search}%`);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const items = data || [];
      const hasMore = items.length > numericLimit;
      const resultListings = hasMore ? items.slice(0, numericLimit) : items;

      let nextCursor = null;
      if (hasMore && resultListings.length > 0) {
        const last = resultListings[resultListings.length - 1];
        nextCursor = `${last.created_at}_${last.id}`;
      }

      return {
        listings: resultListings,
        nextCursor,
        hasMore,
        limit: numericLimit
      };
    }

    // Modo Padrão / Retrocompatibilidade por Offset & Paginação Inicial por Cursor
    const currentPage = Number(page) || 1;
    const offset = (currentPage - 1) * numericLimit;

    let query = supabaseAdmin
      .from('listings')
      .select('*, profiles:owner_id(full_name, campus)', { count: 'exact' })
      .is('deleted_at', null)
      .in('status', ['active', 'negotiating'])
      .order('created_at', { ascending: false })
      .range(offset, offset + numericLimit); // Pede limit + 1 para extrair nextCursor

    if (category) query = query.eq('category', category);
    if (course) query = query.eq('course', course);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const items = data || [];
    const hasMore = items.length > numericLimit;
    const resultListings = hasMore ? items.slice(0, numericLimit) : items;

    let nextCursor = null;
    if (resultListings.length > 0) {
      const last = resultListings[resultListings.length - 1];
      nextCursor = `${last.created_at}_${last.id}`;
    }

    return {
      listings: resultListings,
      total: count || 0,
      page: currentPage,
      totalPages: Math.ceil((count || 0) / numericLimit),
      nextCursor,
      hasMore
    };
  }

  async getListingById(id, requesterId = null, requesterRole = null) {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*, profiles:owner_id(full_name, email, phone_number, campus)')
      .eq('id', id)
      .single();

    if (error || !data) throw new Error('Anúncio não encontrado');

    // Validação de Soft Delete: Oculta se apagado a menos que seja o proprietário ou administrador
    if (data.deleted_at && data.owner_id !== requesterId && requesterRole !== 'admin') {
      throw new Error('Este anúncio foi removido pelo anunciante.');
    }

    return data;
  }

  async getMyListings(userId) {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async deleteListing(listingId, userId, userRole) {
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('owner_id, status, title')
      .eq('id', listingId)
      .single();

    if (!listing) throw new Error('Anúncio não encontrado');
    if (listing.owner_id !== userId && userRole !== 'admin') {
      throw new Error('Sem permissão para apagar este anúncio');
    }

    // ARQUITETURA DE DELEÇÃO LÓGICA (SOFT DELETE):
    // Preserva integridade referencial com chat_messages e audit logs
    const { error } = await supabaseAdmin
      .from('listings')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'removed',
        updated_at: new Date().toISOString()
      })
      .eq('id', listingId);

    if (error) throw new Error(error.message);

    // Se a deleção foi realizada por um administrador em anúncio de terceiro, registra auditoria e resolve denúncias
    if (userRole === 'admin') {
      try {
        await supabaseAdmin
          .from('reports')
          .update({ status: 'resolved', updated_at: new Date().toISOString() })
          .eq('listing_id', listingId);
      } catch (e) {}

      try {
        const { data: adminProfile } = await supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();

        await supabaseAdmin.from('admin_audit_logs').insert({
          admin_id: userId,
          action: 'DELETE_LISTING',
          target_id: listingId,
          details: {
            admin_email: adminProfile?.email || 'admin@ucm.ac.mz',
            title: listing.title,
            owner_id: listing.owner_id,
            reason: 'Remoção direta'
          }
        });
      } catch (e) {}
    }

    return true;
  }
}

module.exports = new ListingService();
