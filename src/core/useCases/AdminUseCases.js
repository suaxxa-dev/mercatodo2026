class AdminUseCases {
  constructor(orderRepository, userRepository, productRepository, auditRepository) {
    this.orderRepo = orderRepository;
    this.userRepo = userRepository;
    this.productRepo = productRepository;
    this.auditRepo = auditRepository;
  }

  // --- Permisos Helper ---
  _requireAdmin(currentAdmin) {
    if (!currentAdmin || !['adminpro', 'adminjunior'].includes(currentAdmin.rol)) {
      throw new Error('Acceso no autorizado: se requieren permisos de administrador.');
    }
  }

  _requireAdminPro(currentAdmin) {
    if (!currentAdmin || currentAdmin.rol !== 'adminpro') {
      throw new Error('Acceso restringido: esta función requiere permisos de Administrador Pro (AdminPro).');
    }
  }

  // --- Estadísticas y Reportes ---

  async getDashboardStats(currentAdmin) {
    this._requireAdmin(currentAdmin);
    return await this.orderRepo.getDashboardStats();
  }

  async getSalesReportByUser(currentAdmin) {
    this._requireAdmin(currentAdmin);
    return await this.orderRepo.getSalesReportByUser();
  }

  // --- Gestión de Pedidos ---

  async getAllOrders(currentAdmin) {
    this._requireAdmin(currentAdmin);
    return await this.orderRepo.getAllOrders();
  }

  async updateOrderStatus(currentAdmin, orderId, estado) {
    this._requireAdmin(currentAdmin);
    const validStates = ['confirmado', 'enviado', 'entregado', 'cancelado'];
    if (!validStates.includes(estado)) {
      throw new Error(`Estado inválido: ${estado}. Opciones: ${validStates.join(', ')}`);
    }

    const result = await this.orderRepo.updateStatusAdmin(orderId, estado);
    if (!result.ok) throw new Error(result.error);

    await this.auditRepo.log(
      currentAdmin.id,
      currentAdmin.nombre,
      currentAdmin.email,
      'ESTADO_PEDIDO',
      `Cambió estado de pedido #${orderId} a '${estado}'`
    );

    return result;
  }

  // --- Gestión de Usuarios (Solo AdminPro) ---

  async getAllUsers(currentAdmin) {
    this._requireAdminPro(currentAdmin);
    return await this.userRepo.getAllUsers();
  }

  async updateUserRole(currentAdmin, targetUserId, newRole) {
    this._requireAdminPro(currentAdmin);

    const validRoles = ['user', 'adminjunior', 'adminpro'];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Rol inválido: ${newRole}. Opciones: ${validRoles.join(', ')}`);
    }

    // Prevenir que un adminpro se quite a sí mismo el rol por error
    if (parseInt(targetUserId, 10) === parseInt(currentAdmin.id, 10) && newRole !== 'adminpro') {
      throw new Error('Por seguridad, no puedes revocar tu propio rol de AdminPro.');
    }

    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) throw new Error('Usuario no encontrado.');

    const oldRole = targetUser.rol || 'user';
    const updated = await this.userRepo.updateRole(targetUserId, newRole);

    await this.auditRepo.log(
      currentAdmin.id,
      currentAdmin.nombre,
      currentAdmin.email,
      'CAMBIO_ROL',
      `Cambió rol de ${targetUser.nombre} (${targetUser.email}) de '${oldRole}' a '${newRole}'`
    );

    return updated;
  }

  // --- Auditoría de Usuarios y Sistema (Solo AdminPro) ---

  async getAuditLogs(currentAdmin, filterAccion = null, limit = 100) {
    this._requireAdminPro(currentAdmin);
    return await this.auditRepo.getLogs(limit, filterAccion);
  }

  // --- Gestión de Inventario / Stock (AdminPro y AdminJunior) ---

  async getProducts(currentAdmin, filters = {}) {
    this._requireAdmin(currentAdmin);
    return await this.productRepo.getAll(filters);
  }

  async updateStock(currentAdmin, productId, newStock) {
    this._requireAdmin(currentAdmin);
    const stockVal = parseInt(newStock, 10);
    if (isNaN(stockVal) || stockVal < 0) {
      throw new Error('La cantidad de stock debe ser un número entero mayor o igual a 0.');
    }

    const updated = await this.productRepo.updateStock(productId, stockVal);
    if (!updated) throw new Error('Producto no encontrado.');

    await this.auditRepo.log(
      currentAdmin.id,
      currentAdmin.nombre,
      currentAdmin.email,
      'STOCK_UPDATE',
      `Actualizó stock de producto '${updated.nombre}' (${productId}) a ${stockVal} unidades`
    );

    return updated;
  }

  // --- Catálogo y Creación de Productos (Solo AdminPro) ---

  async createProduct(currentAdmin, data) {
    this._requireAdminPro(currentAdmin);

    if (!data.nombre || !data.categoria || data.precio === undefined) {
      throw new Error('Nombre, categoría y precio son obligatorios para crear un producto.');
    }

    const created = await this.productRepo.create(data);

    await this.auditRepo.log(
      currentAdmin.id,
      currentAdmin.nombre,
      currentAdmin.email,
      'CREAR_PRODUCTO',
      `Creó producto '${created.nombre}' en categoría '${created.categoria}' con stock ${created.stock}`
    );

    return created;
  }

  async updateProduct(currentAdmin, productId, data) {
    this._requireAdminPro(currentAdmin);
    const updated = await this.productRepo.update(productId, data);
    if (!updated) throw new Error('Producto no encontrado.');

    await this.auditRepo.log(
      currentAdmin.id,
      currentAdmin.nombre,
      currentAdmin.email,
      'MODIFICAR_PRODUCTO',
      `Modificó datos del producto '${updated.nombre}' (${productId})`
    );

    return updated;
  }

  async deleteProduct(currentAdmin, productId) {
    this._requireAdminPro(currentAdmin);
    const product = await this.productRepo.getById(productId);
    if (!product) throw new Error('Producto no encontrado.');

    const ok = await this.productRepo.delete(productId);
    if (ok) {
      await this.auditRepo.log(
        currentAdmin.id,
        currentAdmin.nombre,
        currentAdmin.email,
        'ELIMINAR_PRODUCTO',
        `Eliminó producto '${product.nombre}' (${productId})`
      );
    }
    return { ok };
  }
}

module.exports = AdminUseCases;
