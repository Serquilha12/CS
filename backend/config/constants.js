module.exports = {
  PORT: process.env.PORT || 5000,
  ALLOWED_EMAIL_DOMAIN: '@ucm.ac.mz',
  DEFAULT_CAMPUS: 'Campus de Pemba',
  DEFAULT_FACULTY: 'Faculdade de Gestão de Turismo e Informática',
  CATEGORIES: [
    'Manuais e Livros',
    'Calculadoras',
    'Informática & Gadgets',
    'Material de Desenho',
    'Laboratório',
    'Outros'
  ],
  TRANSACTION_TYPES: [
    'venda',
    'troca',
    'doacao',
    'emprestimo'
  ],
  UPLOAD_LIMITS: {
    MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB (Sistema assume a compressão automática)
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp']
  }
};
