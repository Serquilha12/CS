const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { isAdminEmail } = require('../config/constants');
const JWT_SECRET = process.env.JWT_SECRET || 'ucm-secret-key-pemba-2026';

const TEST_ACCOUNTS = {
  'estudante.teste@ucm.ac.mz': {
    password: 'Senha123!',
    user: {
      id: 'ad0cb5fb-7766-4ad7-ac12-49bbea754e6f',
      email: 'estudante.teste@ucm.ac.mz',
      user_metadata: { full_name: 'Estudante Teste', course: 'Licenciatura em Tecnologias da Informação' }
    },
    profile: {
      id: 'ad0cb5fb-7766-4ad7-ac12-49bbea754e6f',
      email: 'estudante.teste@ucm.ac.mz',
      full_name: 'Estudante Teste',
      course: 'Licenciatura em Tecnologias da Informação',
      campus: 'Campus de Pemba',
      role: 'student'
    }
  },
  'admin.pemba@ucm.ac.mz': {
    password: 'AdminPass123!',
    user: {
      id: '083a72fd-1766-4ecc-aac0-0bd8588a4d9f',
      email: 'admin.pemba@ucm.ac.mz',
      user_metadata: { full_name: 'Administrador UCM Pemba', course: 'Licenciatura em Tecnologias da Informação' }
    },
    profile: {
      id: '083a72fd-1766-4ecc-aac0-0bd8588a4d9f',
      email: 'admin.pemba@ucm.ac.mz',
      full_name: 'Administrador UCM Pemba',
      course: 'Licenciatura em Tecnologias da Informação',
      campus: 'Campus de Pemba',
      role: 'admin'
    }
  }
};

class AuthService {
  async registerUser({ email, password, full_name, course, campus }) {
    const normalizedEmail = email.toLowerCase().trim();
    const isAutoAdmin = isAdminEmail(normalizedEmail);
    const assignedRole = isAutoAdmin ? 'admin' : 'student';
    const redirectUrl = process.env.CLIENT_URL || 'https://cs-psi-five.vercel.app';

    // 1. Criar utilizador através do fluxo formal do Supabase (envio de link de confirmação)
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${redirectUrl}/`,
        data: { full_name, course, campus, role: assignedRole }
      }
    });

    if (signUpErr) {
      if (signUpErr.message?.includes('already registered')) {
        throw new Error('Este e-mail institucional já se encontra registado na plataforma.');
      }
      throw new Error(signUpErr.message);
    }

    const user = signUpData?.user;
    if (!user) {
      throw new Error('Não foi possível iniciar o registo. Verifique os dados e tente novamente.');
    }

    // 2. Garantir perfil na base de dados
    try {
      await supabaseAdmin.from('profiles').upsert({
        id: user.id,
        email: normalizedEmail,
        full_name,
        course,
        campus: campus || 'Campus de Pemba',
        role: assignedRole
      });
    } catch (e) {
      console.warn('[AUTH REGISTER PROFILE]:', e.message);
    }

    // 3. Se a sessão for nula, o Supabase enviou o e-mail de ativação e exige confirmação prévia
    if (!signUpData.session) {
      return {
        requiresEmailConfirmation: true,
        user,
        message: 'Enviámos um link de ativação para o seu e-mail institucional (@ucm.ac.mz). Por favor, aceda à sua caixa de correio da UCM para ativar a sua conta antes de iniciar sessão.'
      };
    }

    const token = jwt.sign(
      { id: user.id, email: normalizedEmail, role: assignedRole, full_name, course },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      requiresEmailConfirmation: false,
      user,
      profile: { id: user.id, email: normalizedEmail, full_name, course, campus, role: assignedRole },
      session: { access_token: token }
    };
  }

  async loginUser({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verificar contas pré-definidas de teste do PRD
    const testAcc = TEST_ACCOUNTS[normalizedEmail];
    if (testAcc && testAcc.password === password) {
      let realUserId = testAcc.profile.id;
      try {
        const { data: dbProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, role')
          .eq('email', normalizedEmail)
          .single();
        if (dbProfile?.id) {
          realUserId = dbProfile.id;
        } else {
          await supabaseAdmin.from('profiles').upsert({
            id: realUserId,
            email: normalizedEmail,
            full_name: testAcc.profile.full_name,
            course: testAcc.profile.course,
            campus: testAcc.profile.campus,
            role: testAcc.profile.role
          });
        }
      } catch (e) {
        console.warn('[AUTH TEST ACC SYNC]:', e.message);
      }

      const token = jwt.sign(
        {
          id: realUserId,
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
        user: { ...testAcc.user, id: realUserId },
        profile: { ...testAcc.profile, id: realUserId }
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

    // 2. Bloqueio estrito se o e-mail institucional não foi confirmado
    if (error && (error.message?.toLowerCase().includes('email not confirmed') || error.message?.toLowerCase().includes('email_not_confirmed'))) {
      throw new Error('A sua conta ainda não foi ativada. Por favor, aceda à sua caixa de correio institucional (@ucm.ac.mz) e clique no link de confirmação que lhe enviámos.');
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
      role: isAdminEmail(normalizedEmail) ? 'admin' : 'student'
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
