const { queryAll, queryOne, query } = require('./PostgresDB');

class AddressRepository {
  async getAddresses(userId) {
    return await queryAll(
      'SELECT id, alias, nombre, calle, ciudad, estado, codigo_postal AS "codigoPostal", predeterminada FROM direcciones WHERE usuario_id = $1 ORDER BY predeterminada DESC, id ASC',
      [userId]
    );
  }

  async addAddress(userId, data) {
    const { alias, nombre, calle, ciudad, estado, codigoPostal, predeterminada } = data;
    if (predeterminada) {
      await query('UPDATE direcciones SET predeterminada = 0 WHERE usuario_id = $1', [userId]);
    }
    const res = await query(
      'INSERT INTO direcciones (usuario_id, alias, nombre, calle, ciudad, estado, codigo_postal, predeterminada) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [userId, alias || '', nombre || '', calle || '', ciudad || '', estado || '', codigoPostal || '', predeterminada ? 1 : 0]
    );
    return res.rows[0].id;
  }

  async updateAddress(userId, addressId, data) {
    const existing = await queryOne('SELECT id FROM direcciones WHERE id = $1 AND usuario_id = $2', [addressId, userId]);
    if (!existing) return { ok: false, error: 'Dirección no encontrada.' };
    
    const { alias, nombre, calle, ciudad, estado, codigoPostal, predeterminada } = data;
    if (predeterminada) {
      await query('UPDATE direcciones SET predeterminada = 0 WHERE usuario_id = $1', [userId]);
    }
    await query(
      'UPDATE direcciones SET alias = $1, nombre = $2, calle = $3, ciudad = $4, estado = $5, codigo_postal = $6, predeterminada = $7 WHERE id = $8 AND usuario_id = $9',
      [alias || '', nombre || '', calle || '', ciudad || '', estado || '', codigoPostal || '', predeterminada ? 1 : 0, addressId, userId]
    );
    return { ok: true };
  }

  async deleteAddress(userId, addressId) {
    const existing = await queryOne('SELECT id FROM direcciones WHERE id = $1 AND usuario_id = $2', [addressId, userId]);
    if (!existing) return { ok: false, error: 'Dirección no encontrada.' };
    await query('DELETE FROM direcciones WHERE id = $1 AND usuario_id = $2', [addressId, userId]);
    return { ok: true };
  }
}

module.exports = new AddressRepository();
