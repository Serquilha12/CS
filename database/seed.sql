-- ============================================================================
-- DADOS INICIAIS DE TESTE (SEED DATA) - CAMPUSSTORE UCM PEMBA
-- ============================================================================

-- Nota: IDs de teste pré-gerados para simulação
INSERT INTO public.global_stats (id, total_users, total_listings, total_completed_sales, total_saved_mzn)
VALUES (1, 4, 6, 2, 4500.00)
ON CONFLICT (id) DO UPDATE 
SET total_users = 4, total_listings = 6, total_completed_sales = 2, total_saved_mzn = 4500.00;
