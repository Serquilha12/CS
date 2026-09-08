const rateLimit = require('express-rate-limit');

// Limitador estrito para tentativas de início de sessão (previne ataques de força bruta)
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // Janela de 10 minutos
  max: 5, // Limite de 5 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiadas tentativas de início de sessão incorretas. Por motivos de segurança institucional, o acesso foi temporariamente bloqueado por 10 minutos. Tente novamente mais tarde.'
  },
  statusCode: 429
});

// Limitador para recuperação de palavra-passe (evita spam e bombardeio de e-mails)
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // Janela de 1 hora
  max: 3, // Limite de 3 pedidos por IP por hora
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Atingiu o limite de pedidos de recuperação de palavra-passe. Aguarde 1 hora antes de efetuar um novo pedido.'
  },
  statusCode: 429
});

// Limitador geral moderado para a API de autenticação
const generalAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 100, // Limite de 100 requisições por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Limite de requisições excedido. Por favor, tente novamente dentro de instantes.'
  },
  statusCode: 429
});

// Limitador para criação de anúncios (evita flood de publicações duplicadas)
const listingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // Limite de 20 anúncios criados por hora por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Limite de criação de anúncios por hora atingido. Aguarde alguns instantes antes de publicar novos materiais.'
  },
  statusCode: 429
});

module.exports = {
  loginLimiter,
  passwordResetLimiter,
  generalAuthLimiter,
  authRateLimiter: generalAuthLimiter,
  listingRateLimiter
};
