const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { isAdminEmail } = require('../config/constants');
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Configuração crítica de segurança: JWT_SECRET não foi configurado nas variáveis de ambiente.');
  }
  return '722fb836b7a614db692dffb072f5f05a9b5cc5fe00d6d2e75cee4161cadb6148';
})();

class AuthService {
  async registerUser({ email, password, full_name, course, campus }) {
    const normalizedEmail = email.toLowerCase().trim();
    const isAutoAdmin = isAdminEmail(normalizedEmail);
    const assignedRole = isAutoAdmin ? 'admin' : 'student';

    // 1. Tentar registo nativo via Supabase Auth (despoleta o envio de OTP de 6 dígitos pelo SMTP configurado)
    let signUpData = null;
    let signUpErr = null;

    try {
      const res = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name,
            course,
            campus: campus || 'Campus de Pemba',
            role: assignedRole
          }
        }
      });
      signUpData = res.data;
      signUpErr = res.error;
    } catch (createEx) {
      console.error('[AUTH SIGNUP EXCEPTION]:', createEx);
      signUpErr = createEx;
    }

    if (signUpErr) {
      const rawErr = (signUpErr.message || '').toString();
      const lowerErr = rawErr.toLowerCase();
      const errCode = (signUpErr.code || '').toString().toLowerCase();

      if (
        errCode === 'email_exists' ||
        errCode === 'user_already_exists' ||
        lowerErr.includes('already been registered') ||
        lowerErr.includes('already registered') ||
        lowerErr.includes('already exists') ||
        lowerErr.includes('duplicate') ||
        lowerErr.includes('user already registered')
      ) {
        // Verificar se este utilizador pendente já tem e-mail confirmado no Supabase Auth
        try {
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

          if (existingUser && !existingUser.email_confirmed_at) {
            // Utilizador NUNCA verificou o OTP anterior: removemos o registo pendente não verificado
            await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
            await supabaseAdmin.from('profiles').delete().eq('id', existingUser.id);

            // Reexecutar signUp limpo para envio de novo OTP
            const retryRes = await supabase.auth.signUp({
              email: normalizedEmail,
              password,
              options: {
                data: {
                  full_name,
                  course,
                  campus: campus || 'Campus de Pemba',
                  role: assignedRole
                }
              }
            });

            if (!retryRes.error && retryRes.data?.user) {
              return {
                requiresOtp: true,
                email: normalizedEmail,
                message: 'Código de verificação de 6 dígitos enviado para o seu correio institucional (@ucm.ac.mz).'
              };
            }
          }
        } catch (checkEx) {
          console.warn('[AUTH CLEANUP UNVERIFIED USER WARNING]:', checkEx.message);
        }

        const dupError = new Error('Este e-mail institucional já se encontra registado e ativo na plataforma. Por favor, inicie sessão.');
        dupError.statusCode = 409;
        throw dupError;
      }

      const cleanErr = new Error(rawErr || 'Não foi possível concluir o registo. Tente novamente.');
      cleanErr.statusCode = signUpErr.status || 400;
      throw cleanErr;
    }

    const user = signUpData?.user;
    if (!user) {
      throw new Error('Não foi possível iniciar o registo. Verifique os dados e tente novamente.');
    }

    // REGRA DE SEGURANÇA: NÃO criar registo na tabela 'profiles' antes da verificação OTP!
    // O perfil só será criado após validação bem-sucedida do OTP no método verifyOtp().

    // Caso de exceção: Se o Supabase estiver configurado com confirmação desligada e gerar sessão imediata
    if (signUpData.session?.access_token) {
      const profile = {
        id: user.id,
        email: normalizedEmail,
        full_name,
        course,
        campus: campus || 'Campus de Pemba',
        role: assignedRole
      };
      await supabaseAdmin.from('profiles').upsert(profile);

      const token = jwt.sign(
        { id: user.id, email: normalizedEmail, role: assignedRole, full_name, course },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return {
        requiresOtp: false,
        user,
        profile,
        session: { access_token: token }
      };
    }

    // Fluxo padrão: Requer validação do código OTP de 6 dígitos enviado por e-mail
    return {
      requiresOtp: true,
      email: normalizedEmail,
      message: 'Código de verificação de 6 dígitos enviado para o seu correio institucional (@ucm.ac.mz).'
    };
  }

  async verifyOtp({ email, token, type = 'signup' }) {
    const normalizedEmail = email.toLowerCase().trim();
    const cleanToken = (token || '').toString().trim().replace(/\D/g, '');

    if (!cleanToken || cleanToken.length < 6) {
      const shortErr = new Error('Introduza o código de verificação completo de 6 dígitos recebido no e-mail.');
      shortErr.statusCode = 400;
      throw shortErr;
    }

    // 1. Tentar validação no Supabase Auth com tipo 'signup'
    let verifyRes = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: cleanToken,
      type: type === 'recovery' ? 'recovery' : 'signup'
    });

    // 2. Fallback com type 'email' via cliente público
    if (verifyRes.error && type === 'signup') {
      const fallbackRes = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: cleanToken,
        type: 'email'
      });
      if (!fallbackRes.error && fallbackRes.data?.user) {
        verifyRes = fallbackRes;
      }
    }

    // 3. Fallback adicional via Supabase Admin (service_role)
    if (verifyRes.error) {
      try {
        const adminRes = await supabaseAdmin.auth.verifyOtp({
          email: normalizedEmail,
          token: cleanToken,
          type: type === 'recovery' ? 'recovery' : 'signup'
        });
        if (!adminRes.error && adminRes.data?.user) {
          verifyRes = adminRes;
        } else if (type === 'signup') {
          const adminEmailRes = await supabaseAdmin.auth.verifyOtp({
            email: normalizedEmail,
            token: cleanToken,
            type: 'email'
          });
          if (!adminEmailRes.error && adminEmailRes.data?.user) {
            verifyRes = adminEmailRes;
          }
        }
      } catch (adminVerifyEx) {
        console.warn('[AUTH ADMIN VERIFY OTP EXCEPTION]:', adminVerifyEx.message);
      }
    }

    if (verifyRes.error) {
      console.warn('[AUTH VERIFY OTP ERROR]:', verifyRes.error.message || verifyRes.error);
      const invalidOtpErr = new Error('Código de verificação incorreto ou expirado. Verifique os algarismos recebidos no e-mail.');
      invalidOtpErr.statusCode = 400;
      throw invalidOtpErr;
    }

    const user = verifyRes.data?.user;
    if (!user) {
      throw new Error('Não foi possível identificar a conta associada a este código de verificação.');
    }

    // 3. Obter ou garantir o perfil do utilizador na tabela 'profiles'
    let profile = await this.getProfile(user.id);
    const metadata = user.user_metadata || {};
    const isAutoAdmin = isAdminEmail(normalizedEmail);
    const role = isAutoAdmin ? 'admin' : (profile?.role || metadata.role || 'student');

    profile = {
      id: user.id,
      email: normalizedEmail,
      full_name: profile?.full_name || metadata.full_name || 'Estudante UCM',
      course: profile?.course || metadata.course || 'Licenciatura em Tecnologias da Informação',
      campus: profile?.campus || metadata.campus || 'Campus de Pemba',
      role
    };

    try {
      await supabaseAdmin.from('profiles').upsert(profile);
    } catch (e) {
      console.warn('[AUTH VERIFY OTP PROFILE UPSERT]:', e.message);
    }

    // 4. Emitir JWT assinado de 7 dias
    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: normalizedEmail,
        role: profile.role,
        full_name: profile.full_name,
        course: profile.course
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      session: { access_token: jwtToken },
      user,
      profile
    };
  }

  async resendOtp({ email, type = 'signup' }) {
    const normalizedEmail = email.toLowerCase().trim();
    const { error } = await supabase.auth.resend({
      type: type === 'recovery' ? 'recovery' : 'signup',
      email: normalizedEmail
    });

    if (error) {
      console.warn('[AUTH RESEND OTP WARNING]:', error.message || error);
      throw new Error(error.message || 'Falha ao reenviar o código de verificação.');
    }

    return {
      success: true,
      message: 'Novo código de verificação enviado para o seu e-mail institucional.'
    };
  }

  async loginUser({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

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

  async forgotPassword(email, clientOrigin = null) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail.endsWith('@ucm.ac.mz')) {
      throw new Error('Apenas e-mails institucionais da UCM (@ucm.ac.mz) são aceites.');
    }
    const clientUrl = clientOrigin || process.env.CLIENT_URL || 'https://campusstore-ucm.vercel.app';
    const redirectUrl = `${clientUrl}/reset-password`;

    let emailSentViaSupabase = false;

    // 1. Tentar primeiro o envio nativo via Supabase Auth (se SMTP estiver configurado no projeto)
    try {
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl
      });
      if (!sbError) {
        emailSentViaSupabase = true;
      } else {
        console.warn('[FORGOT PASSWORD SUPABASE SMTP WARNING]:', sbError.message || sbError);
      }
    } catch (sbEx) {
      console.warn('[FORGOT PASSWORD SUPABASE SMTP EXCEPTION]:', sbEx.message);
    }

    // 2. Se o envio nativo falhar (ex: falta de Custom SMTP no Supabase), acionar fallback resiliente com Supabase Admin
    if (!emailSentViaSupabase) {
      try {
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: normalizedEmail,
          options: {
            redirectTo: redirectUrl
          }
        });

        if (linkErr) {
          console.error('[FORGOT PASSWORD GENERATE LINK ERROR]:', linkErr);
          throw new Error('Não foi possível gerar as instruções de recuperação para este e-mail.');
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log(`[AUTH RECOVERY]: Link de recuperação gerado para ${normalizedEmail}`);
        }
      } catch (adminEx) {
        console.error('[FORGOT PASSWORD ADMIN EXCEPTION]:', adminEx.message);
        throw adminEx;
      }
    }

    return {
      success: true,
      message: 'Se a conta existir, as instruções para redefinir a palavra-passe foram processadas com sucesso.'
    };
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
