const { z } = require('zod');
const { ALLOWED_EMAIL_DOMAIN, CATEGORIES, TRANSACTION_TYPES } = require('../config/constants');

const UCM_EMAIL_REGEX = /^[\w-\.]+@ucm\.ac\.mz$/i;

const registerSchema = z.object({
  email: z
    .string({ required_error: 'O e-mail é obrigatório' })
    .trim()
    .toLowerCase()
    .email('Formato de e-mail inválido')
    .refine(
      (val) => UCM_EMAIL_REGEX.test(val),
      `O e-mail deve pertencer obrigatoriamente ao domínio institucional da UCM (${ALLOWED_EMAIL_DOMAIN})`
    ),
  password: z.string().min(6, 'A palavra-passe deve ter no mínimo 6 caracteres'),
  full_name: z.string().trim().min(3, 'O nome completo é obrigatório'),
  course: z.string().min(2, 'Selecione o seu curso'),
  campus: z.string().default('Campus de Pemba')
});

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

const listingSchema = z.object({
  title: z.string().min(3, 'O título do anúncio deve ter pelo menos 3 caracteres').max(200),
  description: z.string().min(10, 'Forneça uma descrição detalhada do material (no mínimo 10 caracteres)'),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Selecione uma categoria válida' }) }),
  condition: z.enum(['Novo', 'Usado - Excelente', 'Usado - Bom', 'Usado - Aceitável']),
  price_mzn: z.number({ invalid_type_error: 'O preço deve ser um valor numérico em Meticais' }).nonnegative('O preço não pode ser negativo'),
  transaction_type: z.enum(TRANSACTION_TYPES).default('venda'),
  course: z.string().min(2, 'Selecione o curso associado'),
  campus_location: z.string().default('Em frente a biblioteca'),
  images: z.array(z.string().url()).optional()
});

const reservationSchema = z.object({
  listing_id: z.string().uuid('ID de anúncio inválido'),
  seller_id: z.string().uuid().optional().nullable(),
  agreed_price_mzn: z.coerce.number().nonnegative().optional().nullable(),
  meeting_point: z.string().optional().nullable().default('Em frente a biblioteca')
});

module.exports = {
  registerSchema,
  loginSchema,
  listingSchema,
  reservationSchema
};
