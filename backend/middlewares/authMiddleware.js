const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

async function authMiddleware(req, res, next) {
  try {
    // Tenta obter o token via cookie HttpOnly ou Header Authorization
    const token = req.cookies?.cs_token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, error: 'Acesso negado. Token não fornecido.' });
    }

    let user = null;
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
      }
    } catch (e) {}

    if (!user) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ucm-secret-key-pemba-2026');
        if (decoded) {
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

    if (!user) {
      return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada.' });
    }

    // Obter o perfil do utilizador na BD (se disponível)
    let profile = null;
    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (dbProfile) profile = dbProfile;
    } catch (e) {}

    if (profile?.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'A sua conta foi suspensa por violação das diretrizes de segurança da comunidade UCM Pemba.'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || user.role || 'student',
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
