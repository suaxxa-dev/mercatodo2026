const { Pool } = require('pg');
require('dotenv').config();

let pool = null;

function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'mercatodo',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

async function ensureDatabaseExists() {
  if (process.env.DATABASE_URL) return;

  const targetDb = process.env.DB_NAME || 'mercatodo';
  const adminConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };

  const adminPool = new Pool(adminConfig);
  try {
    const res = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDb]
    );
    if (res.rows.length === 0) {
      console.log(`Base de datos '${targetDb}' no existe. Creándola automáticamente...`);
      await adminPool.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`✔ Base de datos '${targetDb}' creada exitosamente.`);
    }
  } catch (err) {
    // Si falla la conexión administrativa, se intentará conectar directamente
    console.warn('Nota al verificar base de datos:', err.message);
  } finally {
    try {
      await adminPool.end();
    } catch {}
  }
}

function getPool() {
  if (!pool) {
    pool = new Pool(getPoolConfig());
    pool.on('error', (err) => {
      console.error('Error inesperado en el pool de PostgreSQL:', err.message);
    });
  }
  return pool;
}

async function initDb() {
  // Asegurar que la base de datos exista antes de conectar
  await ensureDatabaseExists();

  const p = getPool();
  try {
    // Probar conexión
    const client = await p.connect();
    console.log('✔ Conexión a PostgreSQL establecida correctamente.');
    client.release();

    // Crear esquema y seeds iniciales
    const { createSchema } = require('./Schema');
    await createSchema(p);
    return p;
  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL:', error.message);
    throw error;
  }
}

async function query(text, params = []) {
  const p = getPool();
  return await p.query(text, params);
}

async function queryAll(text, params = []) {
  const res = await query(text, params);
  return res.rows;
}

async function queryOne(text, params = []) {
  const rows = await queryAll(text, params);
  return rows.length > 0 ? rows[0] : null;
}

async function runSql(text, params = []) {
  return await query(text, params);
}

module.exports = {
  initDb,
  getPool,
  query,
  queryAll,
  queryOne,
  runSql
};
