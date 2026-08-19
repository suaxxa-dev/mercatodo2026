class AdminController {
  constructor(adminUseCases) {
    this.adminUseCases = adminUseCases;
  }

  _getAdminUser(req) {
    return {
      id: req.session.userId,
      nombre: req.session.userName,
      email: req.session.userEmail,
      rol: req.session.userRol
    };
  }

  getDashboardStats = async (req, res) => {
    try {
      const stats = await this.adminUseCases.getDashboardStats(this._getAdminUser(req));
      res.json({ ok: true, stats });
    } catch (error) {
      res.status(403).json({ ok: false, error: error.message });
    }
  }

  getSalesReport = async (req, res) => {
    try {
      const report = await this.adminUseCases.getSalesReportByUser(this._getAdminUser(req));
      res.json({ ok: true, report });
    } catch (error) {
      res.status(403).json({ ok: false, error: error.message });
    }
  }

  getAllOrders = async (req, res) => {
    try {
      const orders = await this.adminUseCases.getAllOrders(this._getAdminUser(req));
      res.json({ ok: true, orders });
    } catch (error) {
      res.status(403).json({ ok: false, error: error.message });
    }
  }

  updateOrderStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      const result = await this.adminUseCases.updateOrderStatus(this._getAdminUser(req), id, estado);
      res.json({ ok: true, result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  }

  getAllUsers = async (req, res) => {
    try {
      const users = await this.adminUseCases.getAllUsers(this._getAdminUser(req));
      res.json({ ok: true, users });
    } catch (error) {
      res.status(403).json({ ok: false, error: error.message });
    }
  }

  updateUserRole = async (req, res) => {
    try {
      const { id } = req.params;
      const { rol } = req.body;
      const updated = await this.adminUseCases.updateUserRole(this._getAdminUser(req), id, rol);
      res.json({ ok: true, user: updated });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  }

  getAuditLogs = async (req, res) => {
    try {
      const { accion, limit } = req.query;
      const logs = await this.adminUseCases.getAuditLogs(this._getAdminUser(req), accion, parseInt(limit, 10) || 100);
      res.json({ ok: true, logs });
    } catch (error) {
      res.status(403).json({ ok: false, error: error.message });
    }
  }

  getProducts = async (req, res) => {
    try {
      const { categoria, search } = req.query;
      const products = await this.adminUseCases.getProducts(this._getAdminUser(req), { categoria, search });
      res.json({ ok: true, products });
    } catch (error) {
      res.status(403).json({ ok: false, error: error.message });
    }
  }

  updateStock = async (req, res) => {
    try {
      const { id } = req.params;
      const { stock } = req.body;
      const product = await this.adminUseCases.updateStock(this._getAdminUser(req), id, stock);
      res.json({ ok: true, product });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  }

  createProduct = async (req, res) => {
    try {
      const product = await this.adminUseCases.createProduct(this._getAdminUser(req), req.body);
      res.status(201).json({ ok: true, product });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  }

  updateProduct = async (req, res) => {
    try {
      const { id } = req.params;
      const product = await this.adminUseCases.updateProduct(this._getAdminUser(req), id, req.body);
      res.json({ ok: true, product });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  }

  deleteProduct = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.adminUseCases.deleteProduct(this._getAdminUser(req), id);
      res.json({ ok: true, result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  }
}

module.exports = AdminController;
