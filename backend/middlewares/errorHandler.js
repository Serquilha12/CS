const { ZodError } = require('zod');

function errorHandler(err, req, res, next) {
  console.error('[BACKEND ERROR LOG]:', err);

  // 1. Tratamento de erros de validação Zod
  if (err instanceof ZodError) {
    const errorMessages = err.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      error: errorMessages[0] || 'Dados de formulário inválidos.',
      details: errorMessages
    });
  }

  const rawMessage = err.message || '';

  // 2. Tradução de erros de Restrições SQL do PostgreSQL
  if (rawMessage.includes('chk_ucm_email')) {
    return res.status(400).json({
      success: false,
      error: 'Apenas e-mails institucionais da Universidade Católica de Moçambique (@ucm.ac.mz) são aceites na base de dados.'
    });
  }

  if (rawMessage.includes('listings_owner_id_fkey')) {
    return res.status(400).json({
      success: false,
      error: 'O seu perfil de utilizador não foi encontrado na base de dados. Por favor, inicie sessão novamente.'
    });
  }

  if (
    rawMessage.includes('profiles_email_key') ||
    rawMessage.includes('users_email_key') ||
    (rawMessage.includes('duplicate key') && rawMessage.includes('email')) ||
    rawMessage.includes('already registered')
  ) {
    return res.status(409).json({
      success: false,
      error: 'Este e-mail institucional já se encontra registado na plataforma.'
    });
  }

  if (rawMessage.includes('Invalid login credentials')) {
    return res.status(401).json({
      success: false,
      error: 'E-mail ou palavra-passe incorretos. Verifique os seus dados de acesso.'
    });
  }

  // 3. Resposta genérica amigável
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: rawMessage.length < 120 ? rawMessage : 'Ocorreu um erro no servidor. Por favor, tente novamente.'
  });
}

module.exports = errorHandler;
