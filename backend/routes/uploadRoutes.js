const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { uploadRateLimiter } = require('../middlewares/rateLimiter');
const { UPLOAD_LIMITS } = require('../config/constants');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo por imagem
  fileFilter: (req, file, cb) => {
    if (UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de ficheiro não suportado. Apenas imagens JPG, PNG ou WebP são permitidas.'));
    }
  }
});

router.post('/image', authMiddleware, uploadRateLimiter, upload.single('image'), uploadController.uploadImage);

module.exports = router;
