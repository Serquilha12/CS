const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { isAdminEmail } = require('../config/constants');
const JWT_SECRET = process.env.JWT_SECRET || 'ucm-secret-key-pemba-2026';

const TEST_ACCOUNTS = {
  'estudante.teste@ucm.ac.mz': {
    password: 'Senha123!',
    user: {
      id: 'd9b1a5e2-0000-4000-a000-000000000001',
      email: 'estudante.teste@ucm.ac.mz',
      user_metadata: { full_name: 'Estudante Teste', course: 'Licenciatura em Tecnologias da Informação' }
    },
    profile: {
      id: 'd9b1a5e2-0000-4000-a000-000000000001',
      email: 'estudante.teste@ucm.ac.mz',
      full_name: 'Estudante Teste',
      course: 'Licenciatura em Tecnologias da Informação',
      campus: 'Campus de Pemba',
      role: 'student',
      status: 'active'
    }
  },
  'admin.pemba@ucm.ac.mz': {
    password: 'AdminPass123!',
    user: {
      id: 'd9b1a5e2-0000-4000-a000-000000000002',
      email: 'admin.pemba@ucm.ac.mz',
      user_metadata: { full_name: 'Administrador Pemba', course: 'Licenciatura em Tecnologias da Informação' }
    },
    profile: {
      id: 'd9b1a5e2-0000-4000-a000-000000000002',
      email: 'admin.pemba@ucm.ac.mz',
      full_name: 'Administrador Pemba',
      course: 'Licenciatura em Tecnologias da Informação',
      campus: 'Campus de Pemba',
      role: 'admin',
      status: 'active'
    }
  }
};

class AuthService {
  async registerUser({ email, password, full_name, course, campus }) {
    const normalizedEmail = email.toLowerCase().trim();
    const isAutoAdmin = isAdminEmail(normalizedEmail);
    const assignedRole = isAutoAdmin ? 'admin' : 'student';
    let userId;
    let authSession = null;
    let authUser = null;

    try {
      const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name, course, campus, role: assignedRole }
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
            data: { full_name, course, campus, role: assignedRole }
          }
        });

        if (signUpErr && !signUpErr.message.includes('User already registered')) {
          throw new Error(signUpErr.message);
        }

        if (signUpData?.user) {
          authUser = signUpData.user;
          userId = signUpData.user.id;
          authSession = signUpData.session;
        }
      }
    } catch (apiErr) {
      console.warn('[AUTH REGISTER SUPABASE NOTICE]:', apiErr.message);
    }

    if (!userId) {
      userId = 'usr_' + Math.random().toString(36).substring(2, 11);
    }

    if (!authSession) {
      const token = jwt.sign(
        { id: userId, email: normalizedEmail, role: assignedRole, full_name, course },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      authSession = { access_token: token };
    }

    let profile = {
      id: userId,
      email: normalizedEmail,
      full_name,
      course,
      campus: campus || 'Campus de Pemba',
      role: assignedRole,
      status: 'active'
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
    } catch (e) {}

    return { user: authUser || { id: userId, email: normalizedEmail }, profile, session: authSession };
  }

  async loginUser({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verificar contas pré-definidas de teste do PRD
    const testAcc = TEST_ACCOUNTS[normalizedEmail];
    if (testAcc && testAcc.password === password) {
      const token = jwt.sign(
        {
          id: testAcc.profile.id,
          email: testAcc.profile.email,
          role: testAcc.profile.role,
          full_name: testAcc.profile.full_name,
          course: testAcc.profile.course
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        session: { access_token: token },
        user: testAcc.user,
        profile: testAcc.profile
      };
    }

    let data = null;
    let error = null;

    try {
      const res = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      data = res.data;
      error = res.error;
    } catch (netErr) {
      console.warn('[AUTH LOGIN NETWORK WARNING]:', netErr.message);
    }

    if (error && (error.message.includes('Email not confirmed') || error.message.includes('invalid_credentials'))) {
      try {
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = usersList?.users?.find(u => u.email.toLowerCase() === normalizedEmail);

        if (targetUser) {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { email_confirm: true });
          const retry = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
          if (retry.data?.session) {
            data = retry.data;
            error = null;
          }
        }
      } catch (e) {}
    }

    if (error || !data?.user) {
      throw new Error(error?.message === 'Invalid login credentials' ? 'Credenciais de acesso inválidas. Verifique o e-mail e a palavra-passe.' : (error?.message || 'Falha ao autenticar utilizador.'));
    }

    let profile = {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || 'Estudante UCM',
      course: data.user.user_metadata?.course || '',
      campus: data.user.user_metadata?.campus || 'Campus de Pemba',
      role: isAdminEmail(normalizedEmail) ? 'admin' : 'student',
      status: 'active'
    };

    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (dbProfile) profile = dbProfile;
    } catch (e) {}

    // Auto-promoção de role 'admin' caso o e-mail pertença a ADMIN_EMAILS
    if (isAdminEmail(normalizedEmail) && profile.role !== 'admin') {
      profile.role = 'admin';
      try {
        await supabaseAdmin
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', profile.id);
      } catch (adminPromoteErr) {
        console.warn('[ADMIN PROMOTE WARNING]:', adminPromoteErr.message);
      }
    }

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

      if (!error && data) {
        if (isAdminEmail(data.email) && data.role !== 'admin') {
          data.role = 'admin';
          try {
            await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', data.id);
          } catch (e) {}
        }
        return data;
      }
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
