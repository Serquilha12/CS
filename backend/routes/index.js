const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const listingRoutes = require('./listingRoutes');
const chatRoutes = require('./chatRoutes');
const adminRoutes = require('./adminRoutes');
const uploadRoutes = require('./uploadRoutes');
const reservationRoutes = require('./reservationRoutes');

router.use('/auth', authRoutes);
router.use('/listings', listingRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/reservations', reservationRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'CampusStore API Operacional (UCM Pemba)' });
});

module.exports = router;
