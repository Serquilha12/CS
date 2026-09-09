-- ============================================================================
-- CAMPUSSTORE UCM PEMBA - MÁQUINA DE ESTADOS & TRIGGERS DE DADOS (triggers.sql)
-- Transições Atómicas, Regras de Concorrência, Economia Circular & Timeouts
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ATUALIZAÇÃO ESTRUTURAL DAS TABELAS PROFILES & RESERVATIONS
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS savings_mzn NUMERIC(12, 2) DEFAULT 0.00;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS completed_deals INT DEFAULT 0;

ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS buyer_confirmed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS seller_confirmed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Índice parcial exclusivo: impede rigorosamente reservas duplicadas aceites para o mesmo anúncio
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_accepted_reservation_per_listing 
ON public.reservations (listing_id) 
WHERE status = 'accepted';

-- ----------------------------------------------------------------------------
-- 2. PROCEDIMENTO TRANSACIONAL DE CONCORRÊNCIA ATÓMICA (SELECT ... FOR UPDATE)
-- Impede double-booking se dois estudantes clicarem exatamente no mesmo instante
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
    IF v_listing.status IN ('reserved', 'sold', 'completed', 'removed', 'suspended') THEN
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

    -- Inserir nova reserva no estado 'pending'
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
-- 3. TRIGGER DE FINALIZAÇÃO DA RESERVA (triggers.sql)
-- Dispara automaticamente quando status transita para 'completed'
-- 1. Credita 35% de poupança no perfil do comprador
-- 2. Atualiza estatísticas globais do administrador
-- 3. Arquiva o anúncio como 'completed'
-- 4. Emite notificações e mensagem comemorativa de encerramento do chat
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_on_reservation_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_savings NUMERIC(12, 2) := 0.00;
    v_listing_title TEXT;
BEGIN
    -- Obter o título do anúncio
    SELECT title INTO v_listing_title
    FROM public.listings
    WHERE id = NEW.listing_id;

    -- 1. Calcular a poupança estimada (35% do valor da transação face ao mercado de retalho novo)
    IF NEW.agreed_price_mzn IS NOT NULL AND NEW.agreed_price_mzn > 0 THEN
        v_savings := ROUND(NEW.agreed_price_mzn * 0.35, 2);
    ELSE
        v_savings := 0.00;
    END IF;

    -- 2. Atualizar a métrica 'savings_mzn' e 'completed_deals' no perfil do comprador
    UPDATE public.profiles
    SET savings_mzn = COALESCE(savings_mzn, 0.00) + v_savings,
        completed_deals = COALESCE(completed_deals, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.buyer_id;

    -- 3. Incrementar 'completed_deals' no perfil do vendedor
    UPDATE public.profiles
    SET completed_deals = COALESCE(completed_deals, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.seller_id;

    -- 4. Atualizar o Painel Global de Estatísticas do Administrador
    UPDATE public.global_stats
    SET total_completed_sales = total_completed_sales + 1,
        total_saved_mzn = total_saved_mzn + v_savings,
        updated_at = NOW()
    WHERE id = 1;

    -- 5. Atualizar o anúncio para 'completed' (ou 'sold')
    UPDATE public.listings
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = NEW.listing_id;

    -- 6. Inserir notificações no sistema para ambos os utilizadores
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
        NEW.buyer_id,
        'Negócio Concluído com Sucesso!',
        'A sua aquisição de "' || COALESCE(v_listing_title, 'material') || '" foi concluída. Poupança estimada gerada: ' || v_savings || ' MZN!',
        'deal_completed',
        '/perfil'
    );

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
        NEW.seller_id,
        'Entrega Confirmada!',
        'A entrega de "' || COALESCE(v_listing_title, 'material') || '" foi validada duplamente no campus. Obrigado por promover a economia circular UCM.',
        'deal_completed',
        '/perfil'
    );

    -- 7. Inserir mensagem de sistema no chat encerrando o ciclo formalmente
    INSERT INTO public.chat_messages (listing_id, sender_id, receiver_id, message_text, is_read)
    VALUES (
        NEW.listing_id,
        NEW.seller_id,
        NEW.buyer_id,
        '🎉 [SISTEMA]: Troca presencial confirmada por ambas as partes! A transação foi formalmente concluída. Poupança estimada da economia circular: ' || v_savings || ' MZN.',
        FALSE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Associar o trigger à tabela public.reservations
DROP TRIGGER IF EXISTS trg_reservation_completed ON public.reservations;
CREATE TRIGGER trg_reservation_completed
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW
WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed'))
EXECUTE FUNCTION public.fn_on_reservation_completed();

-- ----------------------------------------------------------------------------
-- 4. TRIGGER DE CANCELAMENTO OU EXPIRAÇÃO DA RESERVA
-- Devolve o anúncio automaticamente para 'active' se a reserva for cancelada/expirada
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_on_reservation_cancelled_or_expired()
RETURNS TRIGGER AS $$
BEGIN
    -- Apenas se o anúncio ainda não tiver sido concluído por outra transação
    UPDATE public.listings
    SET status = 'active', updated_at = NOW()
    WHERE id = NEW.listing_id
      AND status IN ('negotiating', 'reserved')
      AND NOT EXISTS (
          SELECT 1 FROM public.reservations 
          WHERE listing_id = NEW.listing_id AND status IN ('accepted', 'completed')
      );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reservation_cancelled_or_expired ON public.reservations;
CREATE TRIGGER trg_reservation_cancelled_or_expired
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW
WHEN (NEW.status IN ('cancelled', 'expired') AND OLD.status NOT IN ('cancelled', 'expired'))
EXECUTE FUNCTION public.fn_on_reservation_cancelled_or_expired();

-- ----------------------------------------------------------------------------
-- 5. PROCEDIMENTO DE EXPIRAÇÃO DE TIMEOUTS (48H / 7 DIAS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_reservation_lifecycle_timeouts()
RETURNS JSONB AS $$
DECLARE
    v_res RECORD;
    v_count_48h INT := 0;
    v_count_7d INT := 0;
BEGIN
    -- 1. Timeout 48 Horas: Vendedor não aceitou o pedido inicial de reserva
    FOR v_res IN 
        SELECT r.id, r.listing_id, r.buyer_id, r.seller_id, l.title
        FROM public.reservations r
        JOIN public.listings l ON l.id = r.listing_id
        WHERE r.status = 'pending'
          AND r.created_at < (NOW() - INTERVAL '48 hours')
    LOOP
        UPDATE public.reservations
        SET status = 'expired',
            cancellation_reason = 'Timeout de 48h: Vendedor não respondeu à solicitação no prazo de 48 horas',
            updated_at = NOW()
        WHERE id = v_res.id;

        UPDATE public.listings
        SET status = 'active', updated_at = NOW()
        WHERE id = v_res.listing_id AND status = 'negotiating';

        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            v_res.buyer_id,
            'Reserva Expirada (48h)',
            'O seu pedido de reserva para "' || v_res.title || '" expirou porque o vendedor não respondeu em 48h.',
            'reservation_expired'
        );

        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            v_res.seller_id,
            'Pedido de Reserva Expirado',
            'O pedido de reserva para "' || v_res.title || '" expirou por ausência de resposta em 48h. O anúncio voltou ao mercado.',
            'reservation_expired'
        );

        v_count_48h := v_count_48h + 1;
    END LOOP;

    -- 2. Timeout 7 Dias: Reserva aceite mas sem dupla confirmação de encontro presencial
    FOR v_res IN 
        SELECT r.id, r.listing_id, r.buyer_id, r.seller_id, l.title
        FROM public.reservations r
        JOIN public.listings l ON l.id = r.listing_id
        WHERE r.status = 'accepted'
          AND r.updated_at < (NOW() - INTERVAL '7 days')
    LOOP
        UPDATE public.reservations
        SET status = 'expired',
            cancellation_reason = 'Timeout de 7 dias: Ausência de dupla confirmação presencial no campus UCM',
            updated_at = NOW()
        WHERE id = v_res.id;

        UPDATE public.listings
        SET status = 'active', updated_at = NOW()
        WHERE id = v_res.listing_id AND status = 'reserved';

        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            v_res.buyer_id,
            'Reserva Expirada (7 Dias)',
            'A reserva de "' || v_res.title || '" foi cancelada automaticamente por exceder 7 dias sem confirmação presencial.',
            'reservation_expired'
        );

        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            v_res.seller_id,
            'Anúncio Reativado no Mercado',
            'A reserva de "' || v_res.title || '" expirou após 7 dias sem conclusão. O item está novamente disponível.',
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
        PERFORM cron.unschedule('campusstore-reservation-timeouts');
        PERFORM cron.schedule(
            'campusstore-reservation-timeouts',
            '0 * * * *', -- Executa a cada hora cheia
            'SELECT public.process_reservation_lifecycle_timeouts();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Extensão pg_cron não ativada. O serviço Node.js executará a rotina de timeouts periodicamente.';
END;
$$;
