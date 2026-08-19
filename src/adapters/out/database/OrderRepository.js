const { queryAll, queryOne, query } = require('./PostgresDB');

class OrderRepository {
  async createOrder(userId, cart, total, codigo) {
    const res = await query(
      'INSERT INTO pedidos (usuario_id, codigo, total, estado) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, codigo, total, 'confirmado']
    );
    const pedidoId = res.rows[0].id;

    for (const item of cart) {
      const pNum = item.precioNum !== undefined ? item.precioNum : (item.precio || 0);
      await query(
        'INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES ($1, $2, $3, $4, $5)',
        [pedidoId, item.nombre, item.img, pNum, item.qty || 1]
      );
    }
    return pedidoId;
  }

  async getOrders(userId) {
    const orders = await queryAll(
      'SELECT id, codigo, fecha, total::float as total, estado FROM pedidos WHERE usuario_id = $1 ORDER BY id DESC',
      [userId]
    );

    for (const o of orders) {
      const items = await queryAll(
        'SELECT nombre, img, precio::float as precio, qty FROM pedido_items WHERE pedido_id = $1',
        [o.id]
      );
      o.items = items;
      try {
        const d = new Date(o.fecha);
        o.fechaLabel = String(d.getDate()).padStart(2, '0') + '/' +
                       String(d.getMonth() + 1).padStart(2, '0') + '/' +
                       d.getFullYear();
      } catch {
        o.fechaLabel = o.fecha;
      }
    }

    return orders;
  }

  async updateOrderStatus(userId, orderId, estado) {
    const existing = await queryOne('SELECT id FROM pedidos WHERE id = $1 AND usuario_id = $2', [orderId, userId]);
    if (!existing) return { ok: false, error: 'Pedido no encontrado.' };
    await query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, orderId]);
    return { ok: true };
  }

  // --- Métodos de Administración ---

  async getAllOrders() {
    const sql = `
      SELECT p.id, p.codigo, p.fecha, p.total::float as total, p.estado, p.usuario_id,
             u.nombre as usuario_nombre, u.email as usuario_email, u.rol as usuario_rol
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.id DESC
    `;
    const orders = await queryAll(sql);

    for (const o of orders) {
      const items = await queryAll(
        'SELECT nombre, img, precio::float as precio, qty FROM pedido_items WHERE pedido_id = $1',
        [o.id]
      );
      o.items = items;
      try {
        const d = new Date(o.fecha);
        o.fechaLabel = String(d.getDate()).padStart(2, '0') + '/' +
                       String(d.getMonth() + 1).padStart(2, '0') + '/' +
                       d.getFullYear() + ' ' +
                       String(d.getHours()).padStart(2, '0') + ':' +
                       String(d.getMinutes()).padStart(2, '0');
      } catch {
        o.fechaLabel = o.fecha;
      }
    }

    return orders;
  }

  async updateStatusAdmin(orderId, estado) {
    const existing = await queryOne('SELECT id, codigo, estado, usuario_id FROM pedidos WHERE id = $1', [orderId]);
    if (!existing) return { ok: false, error: 'Pedido no encontrado.' };
    await query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, orderId]);
    return { ok: true, pedido: existing };
  }

  async getSalesReportByUser() {
    const sql = `
      SELECT 
        u.id, 
        u.nombre, 
        u.email, 
        u.telefono, 
        u.rol,
        u.created_at,
        COUNT(p.id)::int as total_pedidos,
        COALESCE(SUM(CASE WHEN p.estado != 'cancelado' THEN p.total ELSE 0 END), 0)::float as total_gastado,
        MAX(p.fecha) as ultimo_pedido_fecha
      FROM usuarios u
      LEFT JOIN pedidos p ON u.id = p.usuario_id
      GROUP BY u.id
      ORDER BY total_gastado DESC, total_pedidos DESC
    `;
    return await queryAll(sql);
  }

  async getDashboardStats() {
    const totals = await queryOne(`
      SELECT 
        COUNT(id)::int as total_pedidos,
        COALESCE(SUM(CASE WHEN estado != 'cancelado' THEN total ELSE 0 END), 0)::float as total_ventas,
        COALESCE(AVG(CASE WHEN estado != 'cancelado' THEN total ELSE NULL END), 0)::float as ticket_promedio
      FROM pedidos
    `) || { total_pedidos: 0, total_ventas: 0, ticket_promedio: 0 };

    const byStatus = await queryAll(`
      SELECT estado, COUNT(id)::int as count, COALESCE(SUM(total), 0)::float as total
      FROM pedidos
      GROUP BY estado
    `);

    const totalUsuarios = await queryOne('SELECT COUNT(id)::int as count FROM usuarios') || { count: 0 };
    const totalProductos = await queryOne(`
      SELECT 
        COUNT(id)::int as count, 
        COALESCE(SUM(stock), 0)::int as total_stock, 
        COALESCE(SUM(CASE WHEN stock <= 10 THEN 1 ELSE 0 END), 0)::int as low_stock 
      FROM productos
    `) || { count: 0, total_stock: 0, low_stock: 0 };

    return {
      total_pedidos: totals.total_pedidos || 0,
      total_ventas: parseFloat(totals.total_ventas || 0).toFixed(2),
      ticket_promedio: parseFloat(totals.ticket_promedio || 0).toFixed(2),
      total_usuarios: totalUsuarios.count || 0,
      total_productos: totalProductos.count || 0,
      total_stock: totalProductos.total_stock || 0,
      low_stock_count: totalProductos.low_stock || 0,
      estados: byStatus
    };
  }
}

module.exports = new OrderRepository();
