const { supabase, supabaseAdmin } = require('../config/supabase');

class AuthService {
  async registerUser({ email, password, full_name, course, campus }) {
    let userId;
    let authSession = null;
    let authUser = null;

    const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, course, campus }
    });

    if (!adminErr && adminData?.user) {
      authUser = adminData.user;
      userId = adminData.user.id;

      const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
      if (signInData?.session) {
        authSession = signInData.session;
      }
    } else {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
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
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
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
    if (!email.toLowerCase().endsWith('@ucm.ac.mz')) {
      throw new Error('Apenas e-mails institucionais da UCM (@ucm.ac.mz) são aceites.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
    return true;
  }

  async resetPassword(userId, newPassword) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw new Error(error.message);
    return true;
  }
}

module.exports = new AuthService();
