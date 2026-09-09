const listingService = require('../services/listingService');
const { listingSchema } = require('../utils/validators');

class ListingController {
  async create(req, res, next) {
    try {
      const validatedData = listingSchema.parse(req.body);
      const listing = await listingService.createListing(req.user.id, validatedData);

      return res.status(201).json({
        success: true,
        message: 'Anúncio publicado com sucesso!',
        data: listing
      });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const { category, course, search, cursor, page, limit } = req.query;
      const result = await listingService.getListings({ category, course, search, cursor, page, limit });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyListings(req, res, next) {
    try {
      const listings = await listingService.getMyListings(req.user.id);
      return res.status(200).json({
        success: true,
        data: listings
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const listing = await listingService.getListingById(
        req.params.id, 
        req.user?.id || null, 
        req.user?.role || null
      );
      return res.status(200).json({
        success: true,
        data: listing
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await listingService.deleteListing(req.params.id, req.user.id, req.user.role);
      return res.status(200).json({
        success: true,
        message: 'Anúncio removido com sucesso.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ListingController();
