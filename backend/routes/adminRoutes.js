const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminOnly } = require('../middlewares/authMiddleware');

// Rotas exclusivas de Administrador / Moderação
router.get('/dashboard', authMiddleware, adminOnly, adminController.getDashboard);
router.get('/reports', authMiddleware, adminOnly, adminController.getReports);
router.get('/listings', authMiddleware, adminOnly, adminController.getListings);
router.get('/users', authMiddleware, adminOnly, adminController.getUsers);
router.get('/logs', authMiddleware, adminOnly, adminController.getAuditLogs);

router.delete('/listings/:id', authMiddleware, adminOnly, adminController.removeListing);
router.put('/listings/:id/suspend', authMiddleware, adminOnly, adminController.removeListing);
router.put('/users/:id/suspend', authMiddleware, adminOnly, adminController.suspendUser);
router.put('/users/:id/reactivate', authMiddleware, adminOnly, adminController.reactivateUser);
router.put('/users/:id/role', authMiddleware, adminOnly, adminController.updateUserRole);
router.put('/reports/:id/ignore', authMiddleware, adminOnly, adminController.ignoreReport);

// Rota pública para estudantes enviarem denúncias aos moderadores
router.post('/reports', authMiddleware, adminController.createReport);

module.exports = router;
