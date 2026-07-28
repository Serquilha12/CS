const { supabase, supabaseAdmin } = require('../config/supabase');
const socketManager = require('../websocket/socketManager');

class ListingService {
  async createListing(userId, listingData) {
    // 1. Garantir que o perfil existe em public.profiles
    try {
      const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userAuth?.user) {
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          email: userAuth.user.email,
          full_name: userAuth.user.user_metadata?.full_name || 'Estudante UCM',
          course: userAuth.user.user_metadata?.course || listingData.course || 'Licenciatura em Tecnologias da Informação',
          campus: userAuth.user.user_metadata?.campus || 'Campus de Pemba',
          role: 'student'
        });
      }
    } catch (e) {
      console.warn('[LISTING SERVICE WARNING]:', e.message);
    }

    // 2. Inserir anúncio com cliente Admin autenticado pelo backend
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

  async getListings({ category, course, search, page = 1, limit = 15 }) {
    const offset = (page - 1) * limit;
    let query = supabaseAdmin
      .from('listings')
      .select('*, profiles:owner_id(full_name, campus)', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq('category', category);
    if (course) query = query.eq('course', course);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
      listings: data || [],
      total: count || 0,
      page: Number(page),
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  async getListingById(id) {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*, profiles:owner_id(full_name, email, phone_number, campus)')
      .eq('id', id)
      .single();

    if (error) throw new Error('Anúncio não encontrado');

    return data;
  }

  async getMyListings(userId) {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async deleteListing(listingId, userId, userRole) {
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('owner_id')
      .eq('id', listingId)
      .single();

    if (!listing) throw new Error('Anúncio não encontrado');
    if (listing.owner_id !== userId && userRole !== 'admin') {
      throw new Error('Sem permissão para apagar este anúncio');
    }

    const { error } = await supabaseAdmin
      .from('listings')
      .delete()
      .eq('id', listingId);

    if (error) throw new Error(error.message);
    return true;
  }
}

module.exports = new ListingService();
