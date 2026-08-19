const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function createSchema(pool) {
  // 1. Crear tablas si no existen
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         SERIAL PRIMARY KEY,
      nombre     VARCHAR(255) NOT NULL,
      email      VARCHAR(255) NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      telefono   VARCHAR(50) DEFAULT '',
      nacimiento VARCHAR(50) DEFAULT '',
      rol        VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS carrito (
      id           SERIAL PRIMARY KEY,
      usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      producto_id  VARCHAR(100) NOT NULL,
      nombre       VARCHAR(255) NOT NULL,
      precio_num   NUMERIC(10, 2) NOT NULL,
      precio_label VARCHAR(100) NOT NULL,
      img          TEXT NOT NULL,
      qty          INTEGER NOT NULL DEFAULT 1,
      CONSTRAINT uq_usuario_producto UNIQUE (usuario_id, producto_id)
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id         SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      codigo     VARCHAR(50) NOT NULL UNIQUE,
      fecha      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      total      NUMERIC(10, 2) NOT NULL,
      estado     VARCHAR(50) NOT NULL DEFAULT 'confirmado'
    );

    CREATE TABLE IF NOT EXISTS pedido_items (
      id        SERIAL PRIMARY KEY,
      pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      nombre    VARCHAR(255) NOT NULL,
      img       TEXT NOT NULL,
      precio    NUMERIC(10, 2) NOT NULL,
      qty       INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS direcciones (
      id             SERIAL PRIMARY KEY,
      usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      alias          VARCHAR(100) NOT NULL DEFAULT '',
      nombre         VARCHAR(255) NOT NULL DEFAULT '',
      calle          VARCHAR(255) NOT NULL DEFAULT '',
      ciudad         VARCHAR(100) NOT NULL DEFAULT '',
      estado         VARCHAR(100) NOT NULL DEFAULT '',
      codigo_postal  VARCHAR(20) NOT NULL DEFAULT '',
      predeterminada INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS productos (
      id           VARCHAR(100) PRIMARY KEY,
      nombre       VARCHAR(255) NOT NULL,
      categoria    VARCHAR(100) NOT NULL,
      subcategoria VARCHAR(100) DEFAULT '',
      marca        VARCHAR(100) DEFAULT '',
      precio       NUMERIC(10, 2) NOT NULL,
      precio_label VARCHAR(100) NOT NULL,
      img          TEXT NOT NULL,
      sku          VARCHAR(100) NOT NULL,
      stock        INTEGER NOT NULL DEFAULT 50,
      descripcion  TEXT DEFAULT '',
      created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auditoria (
      id             SERIAL PRIMARY KEY,
      usuario_id     INTEGER,
      usuario_nombre VARCHAR(255) DEFAULT '',
      usuario_email  VARCHAR(255) DEFAULT '',
      accion         VARCHAR(100) NOT NULL,
      detalles       TEXT DEFAULT '',
      ip             VARCHAR(50) DEFAULT '127.0.0.1',
      fecha          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);
    CREATE INDEX IF NOT EXISTS idx_carrito_usuario ON carrito(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_direcciones_usuario ON direcciones(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
  `);

  // 2. Seed — usuario demo
  const userCheck = await pool.query("SELECT id FROM usuarios WHERE email = 'demo@mercatodo.com'");
  if (userCheck.rows.length === 0) {
    const hash = bcrypt.hashSync('merca123', 10);
    const userRes = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Juan Suaza', 'demo@mercatodo.com', hash, 'user']
    );
    const uid = userRes.rows[0].id;

    // Pedido 1 — enviado
    const p1 = await pool.query(
      "INSERT INTO pedidos (usuario_id, codigo, fecha, total, estado) VALUES ($1, $2, '2023-10-15', $3, $4) RETURNING id",
      [uid, 'MT-89432', 739.96, 'enviado']
    );
    const o1Id = p1.rows[0].id;
    await pool.query(
      'INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES ($1, $2, $3, $4, $5)',
      [o1Id, 'Sony Headphones WH-CH720N', 'img/cat-tecnologia-audifonos-bt.jpg', 79.99, 1]
    );
    await pool.query(
      'INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES ($1, $2, $3, $4, $5)',
      [o1Id, "Nike Air Force 1 '07", 'img/cat-moda-tenis-urbanos.jpg', 119.00, 1]
    );

    // Pedido 2 — entregado
    const p2 = await pool.query(
      "INSERT INTO pedidos (usuario_id, codigo, fecha, total, estado) VALUES ($1, $2, '2023-09-03', $3, $4) RETURNING id",
      [uid, 'MT-87201', 159.99, 'entregado']
    );
    const o2Id = p2.rows[0].id;
    await pool.query(
      'INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES ($1, $2, $3, $4, $5)',
      [o2Id, 'Monitor LG UltraWide', 'img/cat-tecnologia-monitor-lg.jpg', 329.50, 1]
    );

    console.log('✔ Seed PostgreSQL: usuario demo + pedidos creados.');
  }

  // 3. Seed — adminpro
  const adminHash = bcrypt.hashSync('admin123', 10);
  const adminCheck = await pool.query("SELECT id FROM usuarios WHERE email = 'admin@mercatodo.com'");
  if (adminCheck.rows.length === 0) {
    await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4)',
      ['Admin Pro', 'admin@mercatodo.com', adminHash, 'adminpro']
    );
    console.log('✔ Seed PostgreSQL: usuario adminpro creado.');
  } else {
    await pool.query(
      "UPDATE usuarios SET password = $1, rol = 'adminpro' WHERE email = 'admin@mercatodo.com'",
      [adminHash]
    );
  }

  // 4. Seed — productos de catálogo
  const prodCount = await pool.query('SELECT COUNT(*) as count FROM productos');
  if (parseInt(prodCount.rows[0].count, 10) === 0) {
    try {
      const jsonPath = path.join(__dirname, '..', 'external', 'catalogo_data.json');
      if (fs.existsSync(jsonPath)) {
        const catData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (catData && catData.productos) {
          const insertStmt = `
            INSERT INTO productos (id, nombre, categoria, subcategoria, marca, precio, precio_label, img, sku, stock, descripcion)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO NOTHING
          `;
          for (const p of catData.productos) {
            const rawPrice = parseFloat(String(p.precioLabel).replace(/[^0-9]/g, '')) / 100 || 99.99;
            const catKey = (p.cat || 'tecnologia').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const precio = rawPrice > 10000 ? rawPrice / 1000 : rawPrice;
            await pool.query(insertStmt, [
              p.id,
              p.nombre,
              catKey,
              'general',
              'MERCA TO-DO',
              precio,
              p.precioLabel,
              p.img,
              p.sku || ('SKU-' + p.id.toUpperCase().substring(0, 8)),
              Math.floor(Math.random() * 40) + 15,
              `Producto premium de alta calidad categoría ${p.cat}. Garantía oficial.`
            ]);
          }
          console.log(`✔ Seed PostgreSQL: ${catData.productos.length} productos insertados.`);
        }
      }
    } catch (err) {
      console.warn('Advertencia al cargar seed de productos:', err.message);
    }
  }

  // 5. Seed — auditoria inicial
  const auditCount = await pool.query('SELECT COUNT(*) as count FROM auditoria');
  if (parseInt(auditCount.rows[0].count, 10) === 0) {
    await pool.query(
      `INSERT INTO auditoria (usuario_id, usuario_nombre, usuario_email, accion, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [null, 'Admin Pro', 'admin@mercatodo.com', 'SISTEMA_INICIALIZADO', 'Sistema MERCA TO-DO inicializado con PostgreSQL']
    );
    await pool.query(
      `INSERT INTO auditoria (usuario_id, usuario_nombre, usuario_email, accion, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [null, 'Admin Pro', 'admin@mercatodo.com', 'CREACION_USUARIO', 'Usuario adminpro activado con permisos globales']
    );
  }
}

module.exports = { createSchema };
