const adminService = require('../services/adminService');

class AdminController {
  async getDashboard(req, res, next) {
    try {
      const { search } = req.query;
      const stats = await adminService.getStats();
      const listings = await adminService.getAllListings(search);
      const users = await adminService.getAllUsers(search);
      const reports = await adminService.getReports();
      const auditLogs = await adminService.getAuditLogs();

      return res.status(200).json({
        success: true,
        data: {
          stats,
          recentListings: listings,
          recentUsers: users,
          reports,
          auditLogs
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getReports(req, res, next) {
    try {
      const { status } = req.query;
      const reports = await adminService.getReports(status);
      return res.status(200).json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  }

  async getListings(req, res, next) {
    try {
      const { search } = req.query;
      const listings = await adminService.getAllListings(search);
      return res.status(200).json({ success: true, data: listings });
    } catch (err) {
      next(err);
    }
  }

  async getUsers(req, res, next) {
    try {
      const { search } = req.query;
      const users = await adminService.getAllUsers(search);
      return res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req, res, next) {
    try {
      const auditLogs = await adminService.getAuditLogs();
      return res.status(200).json({ success: true, data: auditLogs });
    } catch (err) {
      next(err);
    }
  }

  async deleteListing(req, res, next) {
    try {
      const { reason } = req.body || {};
      const data = await adminService.deleteListing(req.user.id, req.params.id, reason);
      return res.status(200).json({
        success: true,
        message: 'Anúncio removido definitivamente com sucesso pelo administrador.',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async reactivateListing(req, res, next) {
    try {
      const data = await adminService.reactivateListing(req.user.id, req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Anúncio reativado com sucesso no feed do Marketplace.',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async removeListing(req, res, next) {
    try {
      const { reason } = req.body || {};
      const data = await adminService.removeListing(req.user.id, req.params.id, reason);
      return res.status(200).json({
        success: true,
        message: 'Anúncio suspenso com sucesso pelo administrador.',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async suspendListing(req, res, next) {
    return this.removeListing(req, res, next);
  }

  async suspendUser(req, res, next) {
    try {
      const { reason } = req.body || {};
      const data = await adminService.suspendUser(req.user.id, req.params.id, reason);
      return res.status(200).json({
        success: true,
        message: 'Utilizador suspenso com sucesso. Acesso bloqueado.',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async reactivateUser(req, res, next) {
    try {
      const data = await adminService.reactivateUser(req.user.id, req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Conta de utilizador reativada com sucesso.',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async ignoreReport(req, res, next) {
    try {
      const data = await adminService.ignoreReport(req.user.id, req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Denúncia ignorada e arquivada.',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async createReport(req, res, next) {
    try {
      const data = await adminService.createReport(req.user.id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Denúncia enviada à moderação com sucesso.',
        data
      });
    } catch (err) {
      next(err);
    }
  }
  async updateUserRole(req, res, next) {
    try {
      const { role } = req.body || {};
      const data = await adminService.updateUserRole(req.user.id, req.params.id, role);
      return res.status(200).json({
        success: true,
        message: `Cargo do utilizador alterado com sucesso para "${role}".`,
        data
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
