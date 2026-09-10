const { ZodError } = require('zod');

function errorHandler(err, req, res, next) {
  console.error('[BACKEND ERROR LOG]:', err);

  // 1. Tratamento de erros de validação Zod
  if (err instanceof ZodError || err?.name === 'ZodError') {
    const errorMessages = (err.errors || []).map(e => e.message).filter(Boolean);
    return res.status(400).json({
      success: false,
      error: errorMessages[0] || 'Dados de formulário inválidos.',
      details: errorMessages
    });
  }

  const rawMessage = (err?.message || '').toString();
  const lowerMessage = rawMessage.toLowerCase();
  const errCode = (err?.code || '').toString().toLowerCase();

  // 2. Tradução de erros de Restrições SQL e duplicidade de e-mail institucional
  if (
    errCode === 'email_exists' ||
    lowerMessage.includes('already been registered') ||
    lowerMessage.includes('already registered') ||
    lowerMessage.includes('user already registered') ||
    lowerMessage.includes('profiles_email_key') ||
    lowerMessage.includes('users_email_key') ||
    (lowerMessage.includes('duplicate key') && lowerMessage.includes('email')) ||
    err.statusCode === 409
  ) {
    return res.status(409).json({
      success: false,
      error: 'Este e-mail institucional já se encontra registado na plataforma.'
    });
  }

  if (lowerMessage.includes('chk_ucm_email')) {
    return res.status(400).json({
      success: false,
      error: 'Apenas e-mails institucionais da Universidade Católica de Moçambique (@ucm.ac.mz) são aceites na base de dados.'
    });
  }

  if (lowerMessage.includes('listings_owner_id_fkey')) {
    return res.status(400).json({
      success: false,
      error: 'O seu perfil de utilizador não foi encontrado na base de dados. Por favor, inicie sessão novamente.'
    });
  }

  if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('credenciais de acesso inválidas')) {
    return res.status(401).json({
      success: false,
      error: 'E-mail ou palavra-passe incorretos. Verifique os seus dados de acesso.'
    });
  }

  if (
    lowerMessage.includes('error sending confirmation email') ||
    lowerMessage.includes('unexpected_failure') ||
    lowerMessage.includes('confirmation email')
  ) {
    return res.status(500).json({
      success: false,
      error: 'Falha no serviço de validação por e-mail. A sua conta foi registada, tente iniciar sessão.'
    });
  }

  // 3. Resposta genérica amigável sanitizada (impede envio de "{}", "({})" ou "[object Object]" para o cliente)
  const trimmed = rawMessage.trim();
  const isGarbageMessage =
    !trimmed ||
    trimmed === '{}' ||
    trimmed === '({})' ||
    trimmed === '[]' ||
    trimmed === '([])' ||
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    trimmed.includes('[object Object]') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('und_err');

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const userSafeMessage = isGarbageMessage
    ? 'Ocorreu um erro no servidor. Por favor, tente novamente.'
    : (rawMessage.length < 140 ? rawMessage : 'Ocorreu um erro no servidor. Por favor, tente novamente.');

  return res.status(statusCode).json({
    success: false,
    error: userSafeMessage
  });
}

module.exports = errorHandler;
