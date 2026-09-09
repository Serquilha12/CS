-- ============================================================================
-- CAMPUSSTORE UCM PEMBA - ENGENHARIA ESTRUTURAL & INTEGRIDADE
-- 1. Soft Deletes | 2. Gestão de Concorrência | 3. Ciclos de Vida (pg_cron)
-- 4. Notificações | 5. Índices de Alta Performance para Paginação por Cursor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ARQUITETURA DE DELEÇÃO LÓGICA (SOFT DELETES)
-- ----------------------------------------------------------------------------
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Atualizar Políticas de Row Level Security (RLS) para ocultar itens apagados logicamente
DROP POLICY IF EXISTS "Permitir leitura de anúncios ativos" ON public.listings;
CREATE POLICY "Permitir leitura de anúncios ativos" ON public.listings 
FOR SELECT USING (
    (deleted_at IS NULL AND status IN ('active', 'negotiating')) 
    OR auth.uid() = owner_id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ----------------------------------------------------------------------------
-- 2. TABELA DE NOTIFICAÇÕES (ALIMENTA CICLOS DE VIDA E ALERTAS AO ESTUDANTE)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'system',
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notificações individuais do utilizador" ON public.notifications;
CREATE POLICY "Notificações individuais do utilizador" ON public.notifications
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. ÍNDICES DE ALTA PERFORMANCE (CURSOR PAGINATION & CONCORRÊNCIA)
-- ----------------------------------------------------------------------------
-- Índice composto B-Tree para ordenação estável por cursor (created_at DESC, id DESC) ignorando removidos
CREATE INDEX IF NOT EXISTS idx_listings_cursor_pagination 
ON public.listings (created_at DESC, id DESC) 
WHERE deleted_at IS NULL;

-- Índice para busca rápida de notificações por utilizador
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, is_read, created_at DESC);

-- Índice parcial único: impede rigorosamente que mais de uma reserva 'accepted' exista ao mesmo tempo
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_accepted_reservation_per_listing 
ON public.reservations (listing_id) 
WHERE status = 'accepted';

-- ----------------------------------------------------------------------------
-- 4. PROCEDIMENTO TRANSACIONAL DE CONCORRÊNCIA ATÓMICA (SELECT ... FOR UPDATE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_listing_atomic(
    p_listing_id UUID,
    p_buyer_id UUID,
    p_agreed_price NUMERIC,
    p_meeting_point TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_listing public.listings%ROWTYPE;
    v_existing_res public.reservations%ROWTYPE;
    v_new_res public.reservations%ROWTYPE;
BEGIN
    -- Bloquear a linha do anúncio com bloqueio pessimista exclusivo (FOR UPDATE)
    SELECT * INTO v_listing
    FROM public.listings
    WHERE id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Anúncio não encontrado.';
    END IF;

    IF v_listing.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Este anúncio foi removido.';
    END IF;

    IF v_listing.owner_id = p_buyer_id THEN
        RAISE EXCEPTION 'Não pode reservar o seu próprio anúncio.';
    END IF;

    -- Validar se o anúncio ainda está em estado reservável
    IF v_listing.status IN ('reserved', 'sold', 'removed', 'suspended') THEN
        RAISE EXCEPTION 'Este anúncio já não se encontra disponível para reserva (Concorrência).';
    END IF;

    -- Verificar se o comprador já possui reserva pendente/aceite
    SELECT * INTO v_existing_res
    FROM public.reservations
    WHERE listing_id = p_listing_id 
      AND buyer_id = p_buyer_id 
      AND status IN ('pending', 'accepted')
    ORDER BY created_at DESC 
    LIMIT 1;

    IF FOUND THEN
        RETURN to_jsonb(v_existing_res);
    END IF;

    -- Inserir nova reserva
    INSERT INTO public.reservations (
        listing_id,
        buyer_id,
        seller_id,
        agreed_price_mzn,
        meeting_point,
        status,
        buyer_confirmed,
        seller_confirmed
    )
    VALUES (
        p_listing_id,
        p_buyer_id,
        v_listing.owner_id,
        COALESCE(p_agreed_price, v_listing.price_mzn),
        COALESCE(p_meeting_point, v_listing.campus_location, 'Biblioteca Central - UCM Pemba'),
        'pending',
        FALSE,
        FALSE
    )
    RETURNING * INTO v_new_res;

    -- Atualizar anúncio para 'negotiating' atomicamente
    UPDATE public.listings
    SET status = 'negotiating', updated_at = NOW()
    WHERE id = p_listing_id;

    RETURN to_jsonb(v_new_res);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. PROCEDIMENTO DE EXPIRAÇÃO DE TIMEOUTS E NOTIFICAÇÕES (48H / 7 DIAS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_reservation_lifecycle_timeouts()
RETURNS JSONB AS $$
DECLARE
    v_res RECORD;
    v_count_48h INT := 0;
    v_count_7d INT := 0;
BEGIN
    -- 1. Timeout 48h: Vendedor não respondeu à solicitação pendente
    FOR v_res IN 
        SELECT r.id, r.listing_id, r.buyer_id, r.seller_id, l.title
        FROM public.reservations r
        JOIN public.listings l ON l.id = r.listing_id
        WHERE r.status = 'pending'
          AND r.created_at < (NOW() - INTERVAL '48 hours')
    LOOP
        -- Marcar reserva como expirada
        UPDATE public.reservations
        SET status = 'expired',
            cancellation_reason = 'Timeout de 48h: Vendedor não respondeu à solicitação no prazo estipulado',
            updated_at = NOW()
        WHERE id = v_res.id;

        -- Reverter anúncio para ativo no feed
        UPDATE public.listings
        SET status = 'active', updated_at = NOW()
        WHERE id = v_res.listing_id AND status = 'negotiating';

        -- Notificar Comprador
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            v_res.buyer_id,
            'Reserva Expirada (48h)',
            'O pedido de reserva para "' || v_res.title || '" expirou porque o vendedor não respondeu em 48h.',
            'reservation_expired'
        );

        -- Notificar Vendedor
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            v_res.seller_id,
            'Pedido de Reserva Expirado',
            'O pedido de reserva para "' || v_res.title || '" expirou por ausência de resposta em 48h. O anúncio voltou ao feed.',
            'reservation_expired'
        );

        v_count_48h := v_count_48h + 1;
    END LOOP;

    -- 2. Timeout 7 Dias: Item reservado mas sem dupla confirmação de encontro presencial
    FOR v_res IN 
        SELECT r.id, r.listing_id, r.buyer_id, r.seller_id, l.title
        FROM public.reservations r
        JOIN public.listings l ON l.id = r.listing_id
        WHERE r.status = 'accepted'
          AND r.updated_at < (NOW() - INTERVAL '7 days')
    LOOP
        UPDATE public.reservations
        SET status = 'expired',
            cancellation_reason = 'Timeout de 7 dias: Ausência de dupla confirmação presencial no campus',
            updated_at = NOW()
        WHERE id = v_res.id;

        -- Reverter anúncio para ativo
        UPDATE public.listings
        SET status = 'active', updated_at = NOW()
        WHERE id = v_res.listing_id AND status = 'reserved';

        -- Notificar ambas as partes
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            v_res.buyer_id,
            'Reserva Expirada (7 Dias)',
            'A reserva de "' || v_res.title || '" foi cancelada automaticamente por exceder o prazo de 7 dias sem confirmação.',
            'reservation_expired'
        );

        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            v_res.seller_id,
            'Anúncio Reativado no Feed',
            'A reserva de "' || v_res.title || '" expirou após 7 dias sem conclusão. O item está novamente disponível para outros colegas.',
            'reservation_expired'
        );

        v_count_7d := v_count_7d + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'expired_48h', v_count_48h,
        'expired_7d', v_count_7d,
        'executed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 6. AGENDAMENTO NATIVO VIA EXTENSÃO pg_cron (RODA DE HORA EM HORA)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove agendamento anterior se existir para idempotência
        PERFORM cron.unschedule('campusstore-reservation-timeouts');
        PERFORM cron.schedule(
            'campusstore-reservation-timeouts',
            '0 * * * *', -- Cada hora ao minuto 0
            'SELECT public.process_reservation_lifecycle_timeouts();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Extensão pg_cron não está ativa neste ambiente. O serviço Node.js atuará como agendador contínuo.';
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. HABILITAÇÃO NATIVA DO SUPABASE REALTIME NA TABELA chat_messages
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Publicação supabase_realtime já inclui chat_messages ou requer privilégios de superuser.';
END;
$$;

ALTER TABLE IF EXISTS public.chat_messages REPLICA IDENTITY FULL;

