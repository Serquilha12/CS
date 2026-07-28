-- ============================================================================
-- DATABASE TRIGGERS - CAMPUSSTORE ESTATÍSTICAS EM TEMPO REAL
-- ============================================================================

-- Função para atualizar contadores globais quando nova reserva for concluída
CREATE OR REPLACE FUNCTION public.fn_update_stats_on_reservation_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed')) THEN
        UPDATE public.global_stats
        SET 
            total_completed_sales = total_completed_sales + 1,
            total_saved_mzn = total_saved_mzn + (NEW.agreed_price_mzn * 0.30), -- Estima-se 30% de poupança média em relação ao material novo
            updated_at = NOW()
        WHERE id = 1;

        -- Marcar o anúncio correspondente como vendido
        UPDATE public.listings
        SET status = 'sold', updated_at = NOW()
        WHERE id = NEW.listing_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger acionado ao atualizar estado da reserva
DROP TRIGGER IF EXISTS trg_reservation_completed ON public.reservations;
CREATE TRIGGER trg_reservation_completed
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_stats_on_reservation_completed();

-- Função para atualizar contagem de anúncios e utilizadores
CREATE OR REPLACE FUNCTION public.fn_update_stats_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (TG_TABLE_NAME = 'profiles') THEN
            UPDATE public.global_stats SET total_users = total_users + 1, updated_at = NOW() WHERE id = 1;
        ELSIF (TG_TABLE_NAME = 'listings') THEN
            UPDATE public.global_stats SET total_listings = total_listings + 1, updated_at = NOW() WHERE id = 1;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers de inserção
DROP TRIGGER IF EXISTS trg_profile_inserted ON public.profiles;
CREATE TRIGGER trg_profile_inserted
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_stats_counts();

DROP TRIGGER IF EXISTS trg_listing_inserted ON public.listings;
CREATE TRIGGER trg_listing_inserted
AFTER INSERT ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_stats_counts();
