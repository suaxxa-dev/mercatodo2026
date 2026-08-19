const { queryAll, queryOne, query } = require('./PostgresDB');

class ProductRepository {
  async getAll(filters = {}) {
    let sql = 'SELECT * FROM productos WHERE 1=1';
    const params = [];
    let idx = 1;

    if (filters.categoria) {
      sql += ` AND LOWER(categoria) = LOWER($${idx++})`;
      params.push(filters.categoria.toLowerCase());
    }

    if (filters.search) {
      sql += ` AND (nombre ILIKE $${idx} OR sku ILIKE $${idx} OR descripcion ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      idx++;
    }

    sql += ' ORDER BY created_at DESC';
    const rows = await queryAll(sql, params);
    return rows.map(r => ({
      ...r,
      precio: parseFloat(r.precio),
      stock: parseInt(r.stock, 10)
    }));
  }

  async getById(id) {
    const row = await queryOne('SELECT * FROM productos WHERE id = $1', [id]);
    if (!row) return null;
    return {
      ...row,
      precio: parseFloat(row.precio),
      stock: parseInt(row.stock, 10)
    };
  }

  async create(data) {
    const id = data.id || ('prod-' + Date.now());
    const precio = parseFloat(data.precio) || 0;
    const precioLabel = data.precioLabel || `$ ${new Intl.NumberFormat('es-CO').format(precio)}`;
    const stock = parseInt(data.stock, 10) || 0;

    await query(`
      INSERT INTO productos (id, nombre, categoria, subcategoria, marca, precio, precio_label, img, sku, stock, descripcion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      id,
      data.nombre.trim(),
      (data.categoria || 'tecnologia').toLowerCase(),
      data.subcategoria || '',
      data.marca || 'MERCA TO-DO',
      precio,
      precioLabel,
      data.img || 'img/cat-tecnologia-dell-laptop.jpg',
      data.sku || ('SKU-' + id.toUpperCase().substring(0, 8)),
      stock,
      data.descripcion || ''
    ]);

    return await this.getById(id);
  }

  async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) return null;

    const sets = [];
    const values = [];
    let idx = 1;

    if (data.nombre !== undefined) { sets.push(`nombre = $${idx++}`); values.push(data.nombre.trim()); }
    if (data.categoria !== undefined) { sets.push(`categoria = $${idx++}`); values.push(data.categoria.toLowerCase()); }
    if (data.subcategoria !== undefined) { sets.push(`subcategoria = $${idx++}`); values.push(data.subcategoria); }
    if (data.marca !== undefined) { sets.push(`marca = $${idx++}`); values.push(data.marca); }
    if (data.precio !== undefined) {
      const p = parseFloat(data.precio);
      sets.push(`precio = $${idx++}`);
      values.push(p);
      if (!data.precio_label) {
        sets.push(`precio_label = $${idx++}`);
        values.push(`$ ${new Intl.NumberFormat('es-CO').format(p)}`);
      }
    }
    if (data.precio_label !== undefined) { sets.push(`precio_label = $${idx++}`); values.push(data.precio_label); }
    if (data.img !== undefined) { sets.push(`img = $${idx++}`); values.push(data.img); }
    if (data.sku !== undefined) { sets.push(`sku = $${idx++}`); values.push(data.sku); }
    if (data.stock !== undefined) { sets.push(`stock = $${idx++}`); values.push(parseInt(data.stock, 10)); }
    if (data.descripcion !== undefined) { sets.push(`descripcion = $${idx++}`); values.push(data.descripcion); }

    if (sets.length === 0) return existing;

    values.push(id);
    await query(`UPDATE productos SET ${sets.join(', ')} WHERE id = $${idx}`, values);
    return await this.getById(id);
  }

  async updateStock(id, newStock) {
    const existing = await this.getById(id);
    if (!existing) return null;
    const stock = Math.max(0, parseInt(newStock, 10));
    await query('UPDATE productos SET stock = $1 WHERE id = $2', [stock, id]);
    return await this.getById(id);
  }

  async delete(id) {
    const existing = await this.getById(id);
    if (!existing) return false;
    await query('DELETE FROM productos WHERE id = $1', [id]);
    return true;
  }
}

module.exports = new ProductRepository();
