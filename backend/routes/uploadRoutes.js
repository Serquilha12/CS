const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB (Sistema assume a compressão automática)
});

router.post('/image', authMiddleware, upload.single('image'), uploadController.uploadImage);

module.exports = router;
