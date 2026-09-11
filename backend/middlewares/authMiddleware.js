const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { isAdminEmail } = require('../config/constants');

async function authMiddleware(req, res, next) {
  try {
    // Tenta obter o token via cookie HttpOnly, Header Authorization ou corpo da requisição (útil para reset de senha)
    const token = req.cookies?.cs_token || req.headers.authorization?.replace('Bearer ', '') || req.body?.token;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Acesso negado. Token não fornecido.' });
    }

    let user = null;
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
      }
    } catch (e) {}

    if (!user) {
      if (process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.id) {
            user = {
              id: decoded.id,
              email: decoded.email,
              role: decoded.role || 'student',
              course: decoded.course || '',
              full_name: decoded.full_name || 'Estudante UCM'
            };
          }
        } catch (jwtErr) {}
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada.' });
    }

    // Obter o perfil do utilizador na BD garantindo integridade referencial com supabaseAdmin
    let profile = null;
    try {
      // 1. Tentar localizar perfil diretamente pelo ID
      const { data: dbProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (dbProfile) {
        profile = dbProfile;
      } else if (user.email) {
        // 2. Se o ID for legado mas o e-mail existir na BD, reconcilia para o ID real
        const { data: profileByEmail } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('email', user.email.toLowerCase().trim())
          .maybeSingle();

        if (profileByEmail) {
          profile = profileByEmail;
          user.id = profileByEmail.id;
        }
      }
    } catch (e) {
      console.warn('[AUTH MIDDLEWARE PROFILE LOOKUP]:', e.message);
    }

    if (!profile) {
      return res.status(401).json({ success: false, error: 'Sessão inválida ou perfil de utilizador não encontrado.' });
    }

    if (profile?.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'A sua conta foi suspensa por violação das diretrizes de segurança da comunidade UCM Pemba.'
      });
    }

    const isSystemAdmin = isAdminEmail(user.email) || profile?.role === 'admin' || user.role === 'admin';
    const effectiveRole = isSystemAdmin ? 'admin' : (profile?.role || user.role || 'student');

    // Sincronizar role no banco em background se for admin por e-mail mas estiver desatualizado
    if (isSystemAdmin && profile && profile.role !== 'admin') {
      supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', profile.id).then(() => {}).catch(() => {});
    }

    req.user = {
      id: profile?.id || user.id,
      email: user.email,
      role: effectiveRole,
      status: profile?.status || 'active',
      course: profile?.course || user.course || '',
      full_name: profile?.full_name || user.full_name || ''
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Falha na autenticação do token.' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado. Privilégios de Administrador requeridos.' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware, adminOnly: adminMiddleware };
