-- ============================================================================
-- SUPABASE STORAGE BUCKET & RLS POLICIES - CAMPUSSTORE
-- Bucket: listing-images (Sistema responsável pela compressão automática)
-- Limite: 50MB (52428800 B) | MIME Types: image/jpeg, image/png, image/webp
-- ============================================================================

-- 1. Criar o bucket de armazenamento de imagens
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

-- 2. Políticas RLS para o Supabase Storage (Direct Upload pelo React)

-- Leitura Pública de Imagens
DROP POLICY IF EXISTS "Leitura publica de imagens de anuncios" ON storage.objects;
CREATE POLICY "Leitura publica de imagens de anuncios"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

-- Upload Direto por Estudantes Autenticados
DROP POLICY IF EXISTS "Upload direto por estudantes autenticados" ON storage.objects;
CREATE POLICY "Upload direto por estudantes autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-images');

-- Apagar Fotos pelo Proprietário
DROP POLICY IF EXISTS "Remover fotos pelo proprietario" ON storage.objects;
CREATE POLICY "Remover fotos pelo proprietario"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listing-images');
