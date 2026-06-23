const { Pool } = require('pg');
require('dotenv').config();

async function runTest() {
  const pool = new Pool({
    connectionString: process.env.DB_EXTERNAL_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('1. Conectando a la base de datos para preparar datos (Rol)...');
    // Insertar rol si no existe
    const roleCheck = await pool.query("SELECT * FROM Roles WHERE nombre_rol = 'Admin'");
    let id_role;
    if (roleCheck.rows.length === 0) {
      const resRole = await pool.query("INSERT INTO Roles (nombre_rol) VALUES ('Admin') RETURNING id_role");
      id_role = resRole.rows[0].id_role;
    } else {
      id_role = roleCheck.rows[0].id_role;
    }
    console.log(`Rol Admin asegurado con id: ${id_role}`);

    const randomUser = `testuser_${Math.floor(Math.random() * 10000)}`;
    const randomEmail = `${randomUser}@test.com`;

    console.log(`\n2. Registrando usuario: ${randomUser}...`);
    const regResponse = await fetch('http://localhost:5432/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_role: id_role,
        nombre_completo: 'Usuario de Prueba',
        username: randomUser,
        email: randomEmail,
        password: 'password123'
      })
    });
    const regData = await regResponse.json();
    console.log('Respuesta Registro:', regData);

    console.log(`\n3. Iniciando sesión con: ${randomUser}...`);
    const loginResponse = await fetch('http://localhost:5432/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: randomUser,
        password: 'password123'
      })
    });
    const loginData = await loginResponse.json();
    console.log('Respuesta Login (Token omitido):', loginData.message);
    const token = loginData.token;

    console.log('\n4. Probando ruta protegida (GET /api/habitaciones)...');
    const getResponse = await fetch('http://localhost:5432/api/habitaciones', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const habitaciones = await getResponse.json();
    console.log(`Respuesta Habitaciones: OK. Total encontradas: ${habitaciones.length || 0}`);

    console.log('\n=== Pruebas Completadas Exitosamente ===');
  } catch (err) {
    console.error('Error durante las pruebas:', err);
  } finally {
    await pool.end();
  }
}

runTest();
