const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

async function authMiddleware(req, res, next) {
  try {
    // Tenta obter o token via cookie HttpOnly ou Header Authorization
    const token = req.cookies?.cs_token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, error: 'Acesso negado. Token não fornecido.' });
    }

    // Verificar token via Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada.' });
    }

    // Obter o perfil do utilizador na BD
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'student',
      course: profile?.course || '',
      full_name: profile?.full_name || ''
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
