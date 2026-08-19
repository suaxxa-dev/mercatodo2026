const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', '..', '..', 'mercatodo.db');

let db = null;

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

async function initDb() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  const { createSchema } = require('./Schema');
  createSchema(db, saveDb);

  // Guardar periódicamente (cada 30 seg)
  setInterval(saveDb, 30000);
  return db;
}

function getDb() {
  if (!db) throw new Error('Base de datos no inicializada');
  return db;
}

function queryAll(sql, params) {
  const stmt = getDb().prepare(sql);
  if (params) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function runSql(sql, params) {
  getDb().run(sql, params || []);
  saveDb();
}

function lastId() {
  const r = getDb().exec("SELECT last_insert_rowid()");
  return r[0].values[0][0];
}

module.exports = {
  initDb,
  getDb,
  saveDb,
  queryAll,
  queryOne,
  runSql,
  lastId
};
