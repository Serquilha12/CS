const reservationService = require('../services/reservationService');
const { reservationSchema } = require('../utils/validators');

class ReservationController {
  async create(req, res, next) {
    try {
      const validatedData = reservationSchema.parse(req.body);
      const reservation = await reservationService.createReservation(req.user.id, validatedData);

      return res.status(201).json({
        success: true,
        message: 'Solicitação de reserva submetida com sucesso!',
        data: reservation
      });
    } catch (err) {
      next(err);
    }
  }

  async accept(req, res, next) {
    try {
      const reservation = await reservationService.acceptReservation(req.user.id, req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Reserva aceite com sucesso!',
        data: reservation
      });
    } catch (err) {
      next(err);
    }
  }

  async confirm(req, res, next) {
    try {
      const { roleType } = req.body;
      const result = await reservationService.confirmDouble(req.user.id, req.params.id, roleType);

      return res.status(200).json({
        success: true,
        message: result.isDoubleConfirmed
          ? 'Transação concluída com sucesso por ambas as partes!'
          : 'Sua confirmação foi registada. A aguardar confirmação do colega.',
        data: result.reservation,
        isDoubleConfirmed: result.isDoubleConfirmed
      });
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const reservation = await reservationService.cancelReservation(req.user.id, req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Reserva cancelada. O anúncio regressou ao feed ativo.',
        data: reservation
      });
    } catch (err) {
      next(err);
    }
  }

  async getByListing(req, res, next) {
    try {
      const reservation = await reservationService.getReservationByListing(req.params.listingId);
      return res.status(200).json({
        success: true,
        data: reservation
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReservationController();
