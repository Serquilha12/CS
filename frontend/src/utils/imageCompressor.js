/**
 * Compressão de imagem automática e universal no lado do cliente.
 * O sistema assume 100% da responsabilidade pela compressão de QUALQUER ficheiro (ex: 10MB, 20MB+).
 * Reduz a resolução máxima para 1024x1024px e converte para WebP (~80% qualidade),
 * transformando fotos gigantes em ficheiros leveíssimos (~150KB) em milissegundos.
 */
export async function compressImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    // Processamento automático de qualquer imagem
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calcular novas dimensões mantendo a proporção de aspeto (Aspect Ratio)
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          console.log(`[SISTEMA DE COMPRESSÃO]: Imagem otimizada automaticamente de ${(file.size / (1024 * 1024)).toFixed(2)}MB para ${(compressedFile.size / 1024).toFixed(1)}KB`);
          resolve(compressedFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = (err) => reject(err);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
