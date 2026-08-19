-- ==============================================================================
-- MERCA TO-DO: Script de Base de Datos PostgreSQL
-- ==============================================================================

-- 1. Tabla de Usuarios
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

-- 2. Tabla de Carrito
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

-- 3. Tabla de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo     VARCHAR(50) NOT NULL UNIQUE,
  fecha      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  total      NUMERIC(10, 2) NOT NULL,
  estado     VARCHAR(50) NOT NULL DEFAULT 'confirmado'
);

-- 4. Tabla de Items de Pedido
CREATE TABLE IF NOT EXISTS pedido_items (
  id        SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  nombre    VARCHAR(255) NOT NULL,
  img       TEXT NOT NULL,
  precio    NUMERIC(10, 2) NOT NULL,
  qty       INTEGER NOT NULL DEFAULT 1
);

-- 5. Tabla de Direcciones
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

-- 6. Tabla de Productos
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

-- 7. Tabla de Auditoría
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

-- Índices recomendados
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_carrito_usuario ON carrito(usuario_id);
CREATE INDEX IF NOT EXISTS idx_direcciones_usuario ON direcciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
