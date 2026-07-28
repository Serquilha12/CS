const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, reservationController.create);
router.put('/:id/accept', authMiddleware, reservationController.accept);
router.put('/:id/confirm', authMiddleware, reservationController.confirm);
router.put('/:id/cancel', authMiddleware, reservationController.cancel);
router.get('/listing/:listingId', authMiddleware, reservationController.getByListing);

module.exports = router;
