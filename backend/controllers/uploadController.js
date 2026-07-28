const uploadService = require('../services/uploadService');

class UploadController {
  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Por favor, selecione uma imagem para carregar.' });
      }

      const imageUrl = await uploadService.uploadImage(req.file);

      return res.status(200).json({
        success: true,
        message: 'Imagem carregada com sucesso!',
        data: { url: imageUrl }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UploadController();
