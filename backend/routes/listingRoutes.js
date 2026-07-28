const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { listingRateLimiter } = require('../middlewares/rateLimiter');

router.get('/', listingController.getAll);
router.get('/my-listings', authMiddleware, listingController.getMyListings);
router.get('/:id', listingController.getById);
router.post('/', authMiddleware, listingRateLimiter, listingController.create);
router.delete('/:id', authMiddleware, listingController.delete);

module.exports = router;
