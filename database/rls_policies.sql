-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - CAMPUSSTORE
-- ============================================================================

-- Ativar RLS nas tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_stats ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 1. POLÍTICAS PARA PROFILES
-- ----------------------------------------------------------------------------
-- SELECT: Qualquer utilizador autenticado pode ver os perfis
CREATE POLICY "Permitir leitura de perfis para autenticados"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- UPDATE: Utilizador só pode editar o seu próprio perfil ou se for Admin
CREATE POLICY "Permitir atualização do próprio perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ----------------------------------------------------------------------------
-- 2. POLÍTICAS PARA LISTINGS (ANÚNCIOS)
-- ----------------------------------------------------------------------------
-- SELECT: Todos os anúncios ativos são visíveis publicamente
CREATE POLICY "Permitir leitura de anúncios ativos"
ON public.listings FOR SELECT
USING (status = 'active' OR auth.uid() = owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- INSERT: Apenas utilizadores autenticados podem criar anúncios com seu próprio owner_id
CREATE POLICY "Permitir criação de anúncios pelo proprietário"
ON public.listings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Apenas o dono ou um Admin pode atualizar o anúncio
CREATE POLICY "Permitir edição de anúncios pelo proprietário ou admin"
ON public.listings FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- DELETE: Apagar anúncio restrito estritamente ao dono do anúncio ou Admin
CREATE POLICY "Permitir apagar anúncios pelo proprietário ou admin"
ON public.listings FOR DELETE
TO authenticated
USING (auth.uid() = owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ----------------------------------------------------------------------------
-- 3. POLÍTICAS PARA RESERVATIONS
-- ----------------------------------------------------------------------------
-- SELECT / UPDATE: Apenas o comprador, vendedor ou admin podem ver e gerir a reserva
CREATE POLICY "Permitir acesso a reservas para partes envolvidas ou admin"
ON public.reservations FOR ALL
TO authenticated
USING (
    auth.uid() = buyer_id 
    OR auth.uid() = seller_id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ----------------------------------------------------------------------------
-- 4. POLÍTICAS PARA CHAT_MESSAGES
-- ----------------------------------------------------------------------------
-- SELECT / INSERT: Apenas o emissor ou recetor da mensagem podem aceder ao chat
CREATE POLICY "Permitir chat exclusivo entre participantes da negociação"
ON public.chat_messages FOR ALL
TO authenticated
USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ----------------------------------------------------------------------------
-- 5. POLÍTICAS PARA GLOBAL_STATS
-- ----------------------------------------------------------------------------
-- SELECT: Visível para todos os utilizadores autenticados
CREATE POLICY "Permitir leitura de estatísticas globais"
ON public.global_stats FOR SELECT
TO authenticated
USING (true);
