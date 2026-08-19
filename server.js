/**
 * server.js — Punto de entrada para MERCA TO-DO (Clean Architecture + PostgreSQL)
 */
require('dotenv').config();
const { createApp } = require('./src/app');
const { initDb } = require('./src/adapters/out/database/PostgresDB');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    console.log('Inicializando Base de Datos PostgreSQL...');
    await initDb();
    console.log('Base de Datos PostgreSQL lista con tablas y datos semilla.');

    const app = createApp();

    app.listen(PORT, () => {
      console.log(`\n🟢 MERCA TO-DO servidor activo en http://localhost:${PORT}\n`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    console.error('\n💡 Verifica que PostgreSQL esté corriendo y las credenciales en el archivo .env sean correctas.\n');
    process.exit(1);
  }
})();
