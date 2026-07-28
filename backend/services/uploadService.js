const { supabaseAdmin } = require('../config/supabase');
const { UPLOAD_LIMITS } = require('../config/constants');

class UploadService {
  async uploadImage(file) {
    if (!file) {
      throw new Error('Nenhum ficheiro de imagem foi enviado.');
    }

    // 1. Validação estrita de tamanho (máximo 3MB)
    if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
      throw new Error('A imagem excede o tamanho máximo permitido de 3MB.');
    }

    // 2. Validação estrita de MIME type
    if (!UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error('Formato de ficheiro não suportado. Envie apenas imagens JPG, PNG ou WebP.');
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${file.mimetype.split('/')[1]}`;
    const filePath = `listings/${fileName}`;

    try {
      // Tentar upload para o bucket listing-images no Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from('listing-images')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('listing-images')
          .getPublicUrl(filePath);
        return publicUrlData.publicUrl;
      }
    } catch (e) {
      console.warn('[STORAGE WARNING]: Supabase Storage bucket listing-images não encontrado. Gerando data URL.');
    }

    // Fallback limpo: Converter para Data URL base64 se o bucket do Storage ainda não foi criado no Supabase
    const base64Data = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64Data}`;
  }
}

module.exports = new UploadService();
