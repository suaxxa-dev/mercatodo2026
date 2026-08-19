require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getPool, initDb } = require('./src/adapters/out/database/PostgresDB');

(async () => {
  try {
    console.log('Conectando a PostgreSQL...');
    await initDb();
    const pool = getPool();

    const email = 'admin@mercatodo.com';
    const password = 'admin123';
    const nombre = 'Admin Pro';
    const rol = 'adminpro';

    const existing = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
    const hash = bcrypt.hashSync(password, 10);

    if (existing.rows.length > 0) {
      // Actualizar si ya existe
      await pool.query("UPDATE usuarios SET password = $1, rol = $2, nombre = $3 WHERE email = $4", [hash, rol, nombre, email]);
      console.log('✔ Usuario adminpro actualizado exitosamente.');
    } else {
      // Insertar nuevo
      await pool.query("INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4)", [nombre, email, hash, rol]);
      console.log('✔ Usuario adminpro creado exitosamente.');
    }

    console.log(`Credenciales: Email: ${email} | Password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
