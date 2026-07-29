const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { authRateLimiter } = require('../middlewares/rateLimiter');

router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authMiddleware, authController.resetPassword);
router.get('/me', authMiddleware, authController.me);
router.get('/stats', authMiddleware, authController.getStats);
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;
