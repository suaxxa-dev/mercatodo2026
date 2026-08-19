const { queryAll, query } = require('./PostgresDB');

class AuditRepository {
  async log(usuarioId, usuarioNombre, usuarioEmail, accion, detalles = '', ip = '127.0.0.1') {
    try {
      await query(`
        INSERT INTO auditoria (usuario_id, usuario_nombre, usuario_email, accion, detalles, ip)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [usuarioId || null, usuarioNombre || 'Sistema', usuarioEmail || '', accion, detalles, ip]);
    } catch (err) {
      console.warn('Error registrando auditoría:', err.message);
    }
  }

  async getLogs(limit = 100, filterAccion = null) {
    let sql = 'SELECT * FROM auditoria WHERE 1=1';
    const params = [];
    let idx = 1;

    if (filterAccion) {
      sql += ` AND accion = $${idx++}`;
      params.push(filterAccion);
    }

    sql += ` ORDER BY id DESC LIMIT $${idx}`;
    params.push(limit);

    return await queryAll(sql, params);
  }
}

module.exports = new AuditRepository();
