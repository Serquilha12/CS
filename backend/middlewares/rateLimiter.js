const rateLimit = require('express-rate-limit');

// Rate limiting para rotas de autenticação (Login/Registo): 50 tentativas por minuto (ajustado para suportar testes automatizados como TestSprite)
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 50,
  message: {
    success: false,
    error: 'Muitas tentativas de autenticação. Por favor, aguarde 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para criação de anúncios: 10 por hora
const listingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: {
    success: false,
    error: 'Limite de criação de anúncios atingido (máximo 10 por hora).'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { authRateLimiter, listingRateLimiter };
