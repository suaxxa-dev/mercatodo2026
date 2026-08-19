const { Router } = require('express');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  if (!['adminpro', 'adminjunior'].includes(req.session.userRol)) {
    return res.status(403).json({ error: 'Acceso no autorizado. Se requieren permisos de administración.' });
  }
  next();
}

function requireAdminPro(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  if (req.session.userRol !== 'adminpro') {
    return res.status(403).json({ error: 'Acceso restringido. Esta acción requiere permisos de AdminPro.' });
  }
  next();
}

function createApiRouter(controllers) {
  const router = Router();
  const {
    authController,
    cartController,
    orderController,
    profileController,
    addressController,
    searchController,
    productController,
    adminController
  } = controllers;

  // Products (Público)
  if (productController) {
    router.get('/products', productController.getProducts);
    router.get('/products/:id', productController.getProductById);
  }

  // Auth
  router.post('/auth/register', authController.register);
  router.post('/auth/login', authController.login);
  router.get('/auth/session', authController.session);
  router.post('/auth/logout', authController.logout);
  router.put('/auth/password', requireAuth, authController.changePassword);

  // Cart
  router.get('/cart', requireAuth, cartController.getCart);
  router.post('/cart', requireAuth, cartController.addToCart);
  router.put('/cart/:productoId', requireAuth, cartController.updateQuantity);
  router.delete('/cart/:productoId', requireAuth, cartController.removeFromCart);

  // Orders (Usuario normal)
  router.post('/orders', requireAuth, orderController.createOrder);
  router.get('/orders', requireAuth, orderController.getOrders);
  router.put('/orders/:id/status', requireAuth, orderController.updateStatus);

  // Profile
  router.get('/profile', requireAuth, profileController.getProfile);
  router.put('/profile', requireAuth, profileController.updateProfile);

  // Addresses
  router.get('/addresses', requireAuth, addressController.getAddresses);
  router.post('/addresses', requireAuth, addressController.addAddress);
  router.put('/addresses/:id', requireAuth, addressController.updateAddress);
  router.delete('/addresses/:id', requireAuth, addressController.deleteAddress);

  // Search
  router.get('/search', searchController.search);

  // --- MÓDULO ADMINISTRATIVO ---
  if (adminController) {
    // Métricas y Reportes (AdminPro y AdminJunior)
    router.get('/admin/stats', requireAdmin, adminController.getDashboardStats);
    router.get('/admin/reports/sales-by-user', requireAdmin, adminController.getSalesReport);
    router.get('/admin/orders', requireAdmin, adminController.getAllOrders);
    router.put('/admin/orders/:id/status', requireAdmin, adminController.updateOrderStatus);

    // Gestión de Stock (AdminPro y AdminJunior)
    router.get('/admin/products', requireAdmin, adminController.getProducts);
    router.put('/admin/products/:id/stock', requireAdmin, adminController.updateStock);

    // Gestión de Usuarios y Roles (Solo AdminPro)
    router.get('/admin/users', requireAdminPro, adminController.getAllUsers);
    router.put('/admin/users/:id/role', requireAdminPro, adminController.updateUserRole);

    // Auditoría de Usuarios y Sistema (Solo AdminPro)
    router.get('/admin/audit', requireAdminPro, adminController.getAuditLogs);

    // Catálogo y Productos Avanzado (Solo AdminPro)
    router.post('/admin/products', requireAdminPro, adminController.createProduct);
    router.put('/admin/products/:id', requireAdminPro, adminController.updateProduct);
    router.delete('/admin/products/:id', requireAdminPro, adminController.deleteProduct);
  }

  return router;
}

module.exports = { createApiRouter };
