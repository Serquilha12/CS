const { supabase, supabaseAdmin } = require('../config/supabase');

class AuthService {
  async registerUser({ email, password, full_name, course, campus }) {
    const normalizedEmail = email.toLowerCase().trim();
    let userId;
    let authSession = null;
    let authUser = null;

    const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name, course, campus }
    });

    if (!adminErr && adminData?.user) {
      authUser = adminData.user;
      userId = adminData.user.id;

      const { data: signInData } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signInData?.session) {
        authSession = signInData.session;
      }
    } else {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name, course, campus }
        }
      });

      if (signUpErr) throw new Error(signUpErr.message);

      authUser = signUpData.user;
      userId = signUpData.user.id;
      authSession = signUpData.session;

      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
        const { data: retrySignIn } = await supabase.auth.signInWithPassword({ email, password });
        if (retrySignIn?.session) {
          authSession = retrySignIn.session;
        }
      } catch (e) {}
    }

    let profile = {
      id: userId,
      email,
      full_name,
      course,
      campus: campus || 'Campus de Pemba',
      role: 'student'
    };

    try {
      const { data: dbProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(profile)
        .select()
        .single();

      if (!profileError && dbProfile) {
        profile = dbProfile;
      }
    } catch (e) {
      console.warn('[PROFILES WARNING]:', e.message);
    }

    return { user: authUser, profile, session: authSession };
  }

  async loginUser({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();
    let { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (error && (error.message.includes('Email not confirmed') || error.message.includes('invalid_credentials'))) {
      try {
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = usersList?.users?.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (targetUser) {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { email_confirm: true });
          const retry = await supabase.auth.signInWithPassword({ email, password });
          if (retry.data?.session) {
            data = retry.data;
            error = null;
          }
        }
      } catch (e) {}
    }

    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Credenciais de acesso inválidas. Verifique o e-mail e a palavra-passe.' : error.message);

    let profile = {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || 'Estudante UCM',
      course: data.user.user_metadata?.course || '',
      campus: data.user.user_metadata?.campus || 'Campus de Pemba',
      role: 'student'
    };

    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (dbProfile) profile = dbProfile;
    } catch (e) {}

    return {
      session: data.session,
      user: data.user,
      profile
    };
  }

  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) return data;
    } catch (e) {}

    return {
      id: userId,
      full_name: 'Estudante UCM',
      role: 'student'
    };
  }

  async updateProfile(userId, { full_name, course, campus, phone_number }) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        course,
        campus,
        phone_number,
        updated_at: new Date()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async forgotPassword(email) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail.endsWith('@ucm.ac.mz')) {
      throw new Error('Apenas e-mails institucionais da UCM (@ucm.ac.mz) são aceites.');
    }
    const redirectUrl = `${process.env.CLIENT_URL || 'https://campusstore-ucm.vercel.app'}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectUrl
    });
    if (error) throw new Error(error.message);
    return true;
  }

  async resetPassword(userId, newPassword) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw new Error(error.message);
    return true;
  }

  async getUserStats(userId) {
    const { data: sales } = await supabaseAdmin
      .from('reservations')
      .select('agreed_price_mzn')
      .eq('seller_id', userId)
      .eq('status', 'completed');

    const { data: purchases } = await supabaseAdmin
      .from('reservations')
      .select('agreed_price_mzn')
      .eq('buyer_id', userId)
      .eq('status', 'completed');

    const totalVolumeMoved = (sales || []).reduce((acc, curr) => acc + Number(curr.agreed_price_mzn || 0), 0);
    const totalMoneySaved = (purchases || []).reduce((acc, curr) => acc + (Number(curr.agreed_price_mzn || 0) * 0.35), 0);

    const completedSalesCount = sales ? sales.length : 0;
    const completedPurchasesCount = purchases ? purchases.length : 0;

    return {
      totalVolumeMovedMzn: Number(totalVolumeMoved.toFixed(2)),
      totalMoneySavedMzn: Number(totalMoneySaved.toFixed(2)),
      completedSalesCount,
      completedPurchasesCount,
      totalCompletedTransactions: completedSalesCount + completedPurchasesCount
    };
  }
}

module.exports = new AuthService();
