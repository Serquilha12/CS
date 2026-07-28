/**
 * Utilitário para transformar URLs de imagem do Supabase Storage dinamicamente.
 * Solicita miniaturas otimizadas (ex: 400x400 em WebP) reduzindo drasticamente os dados do utilizador.
 */
export function getOptimizedImageUrl(url, width = 400, height = 400, quality = 80) {
  if (!url) return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

  // Se a URL for do Supabase Storage e não for Data URL ou Unsplash
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    // Adicionar parâmetros de transformação de imagem do Supabase CDN
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&height=${height}&quality=${quality}&format=webp`;
  }

  return url;
}
