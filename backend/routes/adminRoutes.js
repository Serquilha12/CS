const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminOnly } = require('../middlewares/authMiddleware');

router.get('/dashboard', authMiddleware, adminOnly, adminController.getDashboard);
router.delete('/listings/:id', authMiddleware, adminOnly, adminController.removeListing);
router.put('/users/:id/suspend', authMiddleware, adminOnly, adminController.suspendUser);

module.exports = router;
