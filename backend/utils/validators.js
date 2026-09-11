const { z } = require('zod');
const { ALLOWED_EMAIL_DOMAIN, CATEGORIES, TRANSACTION_TYPES } = require('../config/constants');

// Expressões Regulares Oficiais
const UCM_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@ucm\.ac\.mz$/i;
const MOZAMBIQUE_PHONE_REGEX = /^(\+?258\s?)?8[2-7]\d{7}$/;
const FULL_NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'-]+$/;

// Esquema Comum e Reutilizável de Palavra-passe Forte
const passwordSchema = z
  .string({ required_error: 'A palavra-passe é obrigatória' })
  .min(6, 'A palavra-passe deve ter no mínimo 6 caracteres')
  .max(128, 'A palavra-passe não pode exceder 128 caracteres')
  .regex(/[A-Z]/, 'A palavra-passe deve conter pelo menos uma letra maiúscula (A-Z)')
  .regex(/[a-z]/, 'A palavra-passe deve conter pelo menos uma letra minúscula (a-z)')
  .regex(/[0-9]/, 'A palavra-passe deve conter pelo menos um algarismo (0-9)')
  .regex(/[^a-zA-Z0-9\s]/, 'A palavra-passe deve conter pelo menos um caractere especial (!@#$%^&*...)')
  .refine((val) => !/^\s|\s$/.test(val), 'A palavra-passe não pode começar nem terminar com espaços');

// Esquema de Registo de Utilizador
const registerSchema = z.object({
  email: z
    .string({ required_error: 'O e-mail é obrigatório' })
    .trim()
    .toLowerCase()
    .email('Formato de e-mail institucional inválido')
    .refine(
      (val) => UCM_EMAIL_REGEX.test(val),
      `O e-mail deve pertencer obrigatoriamente ao domínio institucional da UCM (${ALLOWED_EMAIL_DOMAIN})`
    ),
  password: passwordSchema,
  full_name: z
    .string({ required_error: 'O nome completo é obrigatório' })
    .trim()
    .min(4, 'O nome deve ter no mínimo 4 caracteres')
    .max(70, 'O nome não pode exceder 70 caracteres')
    .regex(FULL_NAME_REGEX, 'O nome deve conter apenas letras e espaços')
    .refine(
      (val) => val.trim().split(/\s+/).filter(Boolean).length >= 2,
      'Introduza o nome completo com pelo menos Nome e Apelido'
    ),
  course: z.string({ required_error: 'Selecione o seu curso' }).min(2, 'Selecione o seu curso'),
  campus: z.string().default('Campus de Pemba')
});

// Esquema de Início de Sessão
const loginSchema = z.object({
  email: z
    .string({ required_error: 'O e-mail é obrigatório' })
    .trim()
    .toLowerCase()
    .email('Formato de e-mail inválido')
    .refine(
      (val) => UCM_EMAIL_REGEX.test(val),
      `Apenas e-mails institucionais da UCM (${ALLOWED_EMAIL_DOMAIN}) são permitidos.`
    ),
  password: z.string().min(1, 'A palavra-passe é obrigatória')
});

// Esquema de Redefinição de Palavra-passe
const resetPasswordSchema = z.object({
  password: passwordSchema
});

// Esquema de Verificação de Código OTP (suporta 4 a 8 dígitos)
const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: 'O e-mail é obrigatório' })
    .trim()
    .toLowerCase()
    .email('Formato de e-mail inválido')
    .refine(
      (val) => UCM_EMAIL_REGEX.test(val),
      `Apenas e-mails institucionais da UCM (${ALLOWED_EMAIL_DOMAIN}) são permitidos.`
    ),
  token: z
    .string({ required_error: 'O código de verificação é obrigatório' })
    .trim()
    .regex(/^\d{4,10}$/, 'O código deve conter pelo menos 4 algarismos numéricos'),
  type: z.enum(['signup', 'recovery', 'email']).default('signup')
});

// Esquema de Reenvio de Código OTP
const resendOtpSchema = z.object({
  email: z
    .string({ required_error: 'O e-mail é obrigatório' })
    .trim()
    .toLowerCase()
    .email('Formato de e-mail inválido')
    .refine(
      (val) => UCM_EMAIL_REGEX.test(val),
      `Apenas e-mails institucionais da UCM (${ALLOWED_EMAIL_DOMAIN}) são permitidos.`
    ),
  type: z.enum(['signup', 'recovery', 'email']).default('signup')
});

// Esquema de Atualização de Perfil
const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(4, 'O nome deve ter no mínimo 4 caracteres')
    .max(70, 'O nome não pode exceder 70 caracteres')
    .regex(FULL_NAME_REGEX, 'O nome deve conter apenas letras e espaços')
    .refine(
      (val) => val.trim().split(/\s+/).filter(Boolean).length >= 2,
      'Introduza o nome completo com pelo menos Nome e Apelido'
    )
    .optional(),
  course: z.string().min(2, 'Selecione um curso válido').optional(),
  campus: z.string().min(2, 'Indique o campus').optional(),
  phone_number: z
    .string()
    .trim()
    .refine(
      (val) => !val || MOZAMBIQUE_PHONE_REGEX.test(val.replace(/\s+/g, '')),
      'Número de telefone moçambicano inválido (+258 82/83/84/85/86/87...)'
    )
    .optional()
    .nullable()
});

// Esquema de Criação e Edição de Anúncios
const listingSchema = z.object({
  title: z
    .string({ required_error: 'O título do anúncio é obrigatório' })
    .trim()
    .min(3, 'O título do anúncio deve ter pelo menos 3 caracteres')
    .max(100, 'O título não pode exceder 100 caracteres')
    .refine((val) => !/(.)\1{5,}/.test(val), 'O título contém repetição excessiva de caracteres'),
  description: z
    .string({ required_error: 'A descrição do material é obrigatória' })
    .trim()
    .min(10, 'Forneça uma descrição detalhada do material (no mínimo 10 caracteres)')
    .max(2000, 'A descrição não pode exceder 2000 caracteres'),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Selecione uma categoria válida' }) }),
  condition: z.enum(['Novo', 'Usado - Excelente', 'Usado - Bom', 'Usado - Aceitável'], {
    errorMap: () => ({ message: 'Selecione o estado de conservação do material' })
  }),
  price_mzn: z
    .coerce
    .number({ invalid_type_error: 'O preço deve ser um valor numérico em Meticais' })
    .nonnegative('O preço não pode ser negativo')
    .max(250000, 'O preço não pode exceder 250.000 MZN'),
  transaction_type: z.enum(TRANSACTION_TYPES).default('venda'),
  course: z.string().min(2, 'Selecione o curso associado'),
  campus_location: z.string().min(2, 'Indique o ponto de encontro no campus').default('Em frente a biblioteca'),
  images: z
    .array(z.string().url('URL de fotografia inválido'))
    .max(4, 'Pode anexar no máximo 4 fotografias por anúncio')
    .optional()
}).refine((data) => {
  if (data.transaction_type === 'doacao' || data.transaction_type === 'emprestimo') {
    return data.price_mzn === 0;
  }
  return true;
}, {
  message: 'Materiais para doação ou empréstimo devem ter preço fixado em 0 MZN',
  path: ['price_mzn']
});

// Esquema de Reserva Atómica
const reservationSchema = z.object({
  listing_id: z.string().uuid('ID de anúncio inválido'),
  seller_id: z.string().uuid().optional().nullable(),
  agreed_price_mzn: z.coerce.number().nonnegative().max(250000).optional().nullable(),
  meeting_point: z.string().optional().nullable().default('Biblioteca Central - UCM Pemba'),
  initial_message: z.string().max(1000).optional().nullable()
});

module.exports = {
  UCM_EMAIL_REGEX,
  MOZAMBIQUE_PHONE_REGEX,
  passwordSchema,
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
  updateProfileSchema,
  listingSchema,
  reservationSchema
};
