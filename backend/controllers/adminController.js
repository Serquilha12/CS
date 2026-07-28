const adminService = require('../services/adminService');

class AdminController {
  async getDashboard(req, res, next) {
    try {
      const stats = await adminService.getStats();
      const listings = await adminService.getAllListings();
      const users = await adminService.getAllUsers();
      const auditLogs = await adminService.getAuditLogs(req.user.id);

      return res.status(200).json({
        success: true,
        data: {
          stats,
          recentListings: listings,
          recentUsers: users,
          auditLogs
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async removeListing(req, res, next) {
    try {
      await adminService.removeListing(req.user.id, req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Anúncio suspenso pelo administrador.'
      });
    } catch (err) {
      next(err);
    }
  }

  async suspendUser(req, res, next) {
    try {
      await adminService.suspendUser(req.user.id, req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Utilizador suspenso com sucesso. Acesso bloqueado.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
