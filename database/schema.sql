-- ============================================================================
-- SCHEMA PRINCIPAL - CAMPUSSTORE (POSTGRESQL / SUPABASE)
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Perfis de Utilizador (vinculada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL CONSTRAINT chk_ucm_email CHECK (email LIKE '%@ucm.ac.mz'),
    full_name VARCHAR(150) NOT NULL,
    student_id VARCHAR(50),
    course VARCHAR(100) NOT NULL, -- Ex: Licenciatura em Tecnologias da Informação
    campus VARCHAR(100) NOT NULL DEFAULT 'Campus de Pemba',
    faculty VARCHAR(150) DEFAULT 'Faculdade de Gestão de Turismo e Informática',
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    avatar_url TEXT,
    phone_number VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Anúncios de Materiais Académicos
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
    campus_location VARCHAR(100) NOT NULL DEFAULT 'Em frente a biblioteca',
    status VARCHAR(25) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'negotiating', 'reserved', 'sold', 'removed', 'suspended')),
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    view_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Reservas e Transações
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    agreed_price_mzn NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(25) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled', 'expired')),
    buyer_confirmed BOOLEAN DEFAULT FALSE,
    seller_confirmed BOOLEAN DEFAULT FALSE,
    meeting_point VARCHAR(150) NOT NULL DEFAULT 'Em frente a biblioteca',
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4. Tabela de Mensagens do Chat em Tempo Real
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Denúncias de Conteúdo / Utilizadores
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(25) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de Logs de Auditoria de Moderação de Administradores
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Estatísticas Globais (Alimenta o Painel Admin via Triggers)
CREATE TABLE IF NOT EXISTS public.global_stats (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    total_users INT DEFAULT 0,
    total_listings INT DEFAULT 0,
    total_completed_sales INT DEFAULT 0,
    total_saved_mzn NUMERIC(12, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir linha única de estatísticas globais caso não exista
INSERT INTO public.global_stats (id, total_users, total_listings, total_completed_sales, total_saved_mzn)
VALUES (1, 0, 0, 0, 0.00)
ON CONFLICT (id) DO NOTHING;
