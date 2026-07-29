-- ============================================================================
-- INSTALAÇÃO COMPLETA DA BASE DE DADOS, ARQUITETURA DE SEGURANÇA E AUDITORIA
-- CAMPUSSTORE UCM PEMBA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ESTRUTURA DE TABELAS (SCHEMA)
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Perfis de Utilizador (Vinculados a auth.users com validação rígida de e-mail UCM e RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL CONSTRAINT chk_ucm_email CHECK (email LIKE '%@ucm.ac.mz'),
    full_name VARCHAR(150) NOT NULL DEFAULT 'Estudante UCM',
    student_id VARCHAR(50),
    course VARCHAR(100) NOT NULL DEFAULT 'Licenciatura em Tecnologias da Informação',
    campus VARCHAR(100) NOT NULL DEFAULT 'Campus de Pemba',
    faculty VARCHAR(150) DEFAULT 'Faculdade de Gestão de Turismo e Informática',
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    avatar_url TEXT,
    phone_number VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Anúncios de Materiais Académicos (Suporta Venda, Troca, Doação e Empréstimo)
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Manuais e Livros', 'Calculadoras', 'Informática & Gadgets', 'Material de Desenho', 'Laboratório', 'Outros')),
    condition VARCHAR(30) NOT NULL CHECK (condition IN ('Novo', 'Usado - Excelente', 'Usado - Bom', 'Usado - Aceitável')),
    price_mzn NUMERIC(10, 2) NOT NULL CHECK (price_mzn >= 0),
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'venda' CHECK (transaction_type IN ('venda', 'troca', 'doacao', 'emprestimo')),
    course VARCHAR(100) NOT NULL,
    campus_location VARCHAR(100) NOT NULL DEFAULT 'Biblioteca Central',
    status VARCHAR(25) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'negotiating', 'reserved', 'sold', 'removed')),
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    view_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reservas e Transações com Confirmação Dupla
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    agreed_price_mzn NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(25) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled', 'expired')),
    buyer_confirmed BOOLEAN DEFAULT FALSE,
    seller_confirmed BOOLEAN DEFAULT FALSE,
    meeting_point VARCHAR(150) NOT NULL DEFAULT 'Biblioteca Central - UCM Pemba',
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Mensagens do Chat em Tempo Real
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logs de Auditoria de Moderação de Administradores
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estatísticas Globais (Alimenta o Painel Admin)
CREATE TABLE IF NOT EXISTS public.global_stats (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    total_users INT DEFAULT 0,
    total_listings INT DEFAULT 0,
    total_completed_sales INT DEFAULT 0,
    total_saved_mzn NUMERIC(12, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.global_stats (id, total_users, total_listings, total_completed_sales, total_saved_mzn)
VALUES (1, 0, 0, 0, 0.00)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. AUTO-SINCRONIZAÇÃO FILTRADA DE E-MAILS INSTITUCIONAIS (@ucm.ac.mz)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email LIKE '%@ucm.ac.mz' THEN
    INSERT INTO public.profiles (id, email, full_name, course, campus, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Estudante UCM'),
      COALESCE(NEW.raw_user_meta_data->>'course', 'Licenciatura em Tecnologias da Informação'),
      COALESCE(NEW.raw_user_meta_data->>'campus', 'Campus de Pemba'),
      'student'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar apenas utilizadores com e-mail institucional @ucm.ac.mz
INSERT INTO public.profiles (id, email, full_name, course, campus, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', 'Estudante UCM'),
  COALESCE(raw_user_meta_data->>'course', 'Licenciatura em Tecnologias da Informação'),
  COALESCE(raw_user_meta_data->>'campus', 'Campus de Pemba'),
  'student'
FROM auth.users
WHERE email LIKE '%@ucm.ac.mz'
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_stats ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Permitir leitura de perfis para autenticados" ON public.profiles;
CREATE POLICY "Permitir leitura de perfis para autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir atualização do próprio perfil" ON public.profiles;
CREATE POLICY "Permitir atualização do próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Listings Policies
DROP POLICY IF EXISTS "Permitir leitura de anúncios ativos" ON public.listings;
CREATE POLICY "Permitir leitura de anúncios ativos" ON public.listings FOR SELECT USING (status IN ('active', 'negotiating') OR auth.uid() = owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Permitir criação de anúncios pelo proprietário" ON public.listings;
CREATE POLICY "Permitir criação de anúncios pelo proprietário" ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Permitir edição de anúncios pelo proprietário ou admin" ON public.listings;
CREATE POLICY "Permitir edição de anúncios pelo proprietário ou admin" ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Permitir apagar anúncios pelo proprietário ou admin" ON public.listings;
CREATE POLICY "Permitir apagar anúncios pelo proprietário ou admin" ON public.listings FOR DELETE TO authenticated USING (auth.uid() = owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Reservations Policies
DROP POLICY IF EXISTS "Permitir acesso a reservas para partes envolvidas ou admin" ON public.reservations;
CREATE POLICY "Permitir acesso a reservas para partes envolvidas ou admin" ON public.reservations FOR ALL TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Chat Policies
DROP POLICY IF EXISTS "Permitir chat exclusivo entre participantes da negociação" ON public.chat_messages;
CREATE POLICY "Permitir chat exclusivo entre participantes da negociação" ON public.chat_messages FOR ALL TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Admin Audit Logs Policy
DROP POLICY IF EXISTS "Acesso exclusivo a logs de auditoria para administradores" ON public.admin_audit_logs;
CREATE POLICY "Acesso exclusivo a logs de auditoria para administradores" ON public.admin_audit_logs FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Global Stats Policy
DROP POLICY IF EXISTS "Permitir leitura de estatísticas globais" ON public.global_stats;
CREATE POLICY "Permitir leitura de estatísticas globais" ON public.global_stats FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 4. SUPABASE STORAGE BUCKET & RLS POLICIES FOR DIRECT UPLOAD
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'listing-images', 
    'listing-images', 
    true, 
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Leitura publica de imagens de anuncios" ON storage.objects;
CREATE POLICY "Leitura publica de imagens de anuncios" ON storage.objects FOR SELECT USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "Upload direto por estudantes autenticados" ON storage.objects;
CREATE POLICY "Upload direto por estudantes autenticados" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "Remover fotos pelo proprietario" ON storage.objects;
CREATE POLICY "Remover fotos pelo proprietario" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'listing-images');

-- ----------------------------------------------------------------------------
-- 5. TRIGGERS E TIMEOUTS AUTOMÁTICOS (CONFIRMAÇÃO DUPLA & EXPIRAÇÃO)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_update_stats_on_double_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.buyer_confirmed = TRUE AND NEW.seller_confirmed = TRUE AND (OLD.status <> 'completed' OR OLD.buyer_confirmed = FALSE OR OLD.seller_confirmed = FALSE)) THEN
        NEW.status := 'completed';
        NEW.completed_at := NOW();

        UPDATE public.global_stats
        SET 
            total_completed_sales = total_completed_sales + 1,
            total_saved_mzn = total_saved_mzn + (NEW.agreed_price_mzn * 0.30),
            updated_at = NOW()
        WHERE id = 1;

        UPDATE public.listings
        SET status = 'sold', updated_at = NOW()
        WHERE id = NEW.listing_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_double_confirmation ON public.reservations;
CREATE TRIGGER trg_double_confirmation
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_stats_on_double_confirmation();

-- ----------------------------------------------------------------------------
-- 6. ÍNDICES B-TREE DE ALTA PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listings_course_status ON public.listings (course, status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_category_price ON public.listings (category, price_mzn);
CREATE INDEX IF NOT EXISTS idx_chat_messages_lookup ON public.chat_messages (listing_id, sender_id, receiver_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs ON public.admin_audit_logs (created_at DESC);
