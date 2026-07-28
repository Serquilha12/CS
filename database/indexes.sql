-- ============================================================================
-- ÍNDICES ESTRATÉGICOS (B-TREE) - CAMPUSSTORE OTIMIZAÇÕES DE LEITURA
-- ============================================================================

-- Otimização da filtragem de anúncios por curso e estado
CREATE INDEX IF NOT EXISTS idx_listings_course_status 
ON public.listings (course, status);

-- Otimização de ordenação por data de criação (para listagem recente)
CREATE INDEX IF NOT EXISTS idx_listings_created_at 
ON public.listings (created_at DESC);

-- Otimização da busca por categoria e preço
CREATE INDEX IF NOT EXISTS idx_listings_category_price 
ON public.listings (category, price_mzn);

-- Otimização do chat em tempo real por conversa e anúncio
CREATE INDEX IF NOT EXISTS idx_chat_messages_lookup 
ON public.chat_messages (listing_id, sender_id, receiver_id, created_at ASC);

-- Otimização de perfis por e-mail institucional
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles (email);
