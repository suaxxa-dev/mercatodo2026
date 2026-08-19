const { queryAll, queryOne, query } = require('./PostgresDB');

class CartRepository {
  async getCart(userId) {
    const rows = await queryAll(
      'SELECT producto_id AS id, nombre, precio_num::float AS "precioNum", precio_label AS "precioLabel", img, qty FROM carrito WHERE usuario_id = $1 ORDER BY id',
      [userId]
    );
    return rows;
  }

  async addToCart(userId, item) {
    const existing = await queryOne(
      'SELECT id, qty FROM carrito WHERE usuario_id = $1 AND producto_id = $2',
      [userId, item.id]
    );

    if (existing) {
      await query('UPDATE carrito SET qty = qty + 1 WHERE id = $1', [existing.id]);
    } else {
      await query(
        'INSERT INTO carrito (usuario_id, producto_id, nombre, precio_num, precio_label, img, qty) VALUES ($1, $2, $3, $4, $5, $6, 1)',
        [userId, item.id, item.nombre, item.precioNum, item.precioLabel, item.img]
      );
    }
    return true;
  }

  async updateCartQty(userId, productoId, qty) {
    if (qty < 1) {
      await query('DELETE FROM carrito WHERE usuario_id = $1 AND producto_id = $2', [userId, productoId]);
    } else {
      await query('UPDATE carrito SET qty = $1 WHERE usuario_id = $2 AND producto_id = $3', [qty, userId, productoId]);
    }
  }

  async removeFromCart(userId, productoId) {
    await query('DELETE FROM carrito WHERE usuario_id = $1 AND producto_id = $2', [userId, productoId]);
  }

  async clearCart(userId) {
    await query('DELETE FROM carrito WHERE usuario_id = $1', [userId]);
  }
}

module.exports = new CartRepository();
