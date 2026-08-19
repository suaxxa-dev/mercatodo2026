const { queryOne, queryAll, query } = require('./PostgresDB');

class UserRepository {
  async create(nombre, email, hash) {
    try {
      const res = await query(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
        [nombre.trim(), email.trim().toLowerCase(), hash, 'user']
      );
      return res.rows[0];
    } catch (err) {
      if (err.code === '23505' || (err.message && err.message.includes('unique'))) {
        return null;
      }
      throw err;
    }
  }

  async findByEmail(email) {
    return await queryOne('SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)', [email.trim()]);
  }

  async findById(id) {
    return await queryOne(
      'SELECT id, nombre, email, telefono, nacimiento, password, rol, created_at FROM usuarios WHERE id = $1',
      [id]
    );
  }

  async updateProfile(userId, data) {
    const sets = [];
    const values = [];
    let idx = 1;

    if (data.nombre !== undefined) {
      sets.push(`nombre = $${idx++}`);
      values.push(data.nombre.trim());
    }
    if (data.telefono !== undefined) {
      sets.push(`telefono = $${idx++}`);
      values.push(data.telefono.trim());
    }
    if (data.nacimiento !== undefined) {
      sets.push(`nacimiento = $${idx++}`);
      values.push(data.nacimiento);
    }

    if (sets.length === 0) return false;

    values.push(userId);
    await query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${idx}`, values);
    return true;
  }

  async updatePassword(userId, newHash) {
    await query('UPDATE usuarios SET password = $1 WHERE id = $2', [newHash, userId]);
    return true;
  }

  // --- Métodos de Administración ---

  async getAllUsers() {
    const sql = `
      SELECT 
        u.id, 
        u.nombre, 
        u.email, 
        u.telefono, 
        u.nacimiento,
        u.rol, 
        u.created_at,
        COUNT(p.id)::int as total_pedidos,
        COALESCE(SUM(CASE WHEN p.estado != 'cancelado' THEN p.total ELSE 0 END), 0)::float as total_gastado
      FROM usuarios u
      LEFT JOIN pedidos p ON u.id = p.usuario_id
      GROUP BY u.id
      ORDER BY u.id ASC
    `;
    return await queryAll(sql);
  }

  async updateRole(userId, newRole) {
    const validRoles = ['user', 'adminjunior', 'adminpro'];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Rol inválido: ${newRole}. Debe ser user, adminjunior o adminpro.`);
    }
    await query('UPDATE usuarios SET rol = $1 WHERE id = $2', [newRole, userId]);
    return await this.findById(userId);
  }
}

module.exports = new UserRepository();
