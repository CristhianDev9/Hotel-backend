const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Registro de usuarios/empleados
const register = async (req, res) => {
  const { id_role, nombre_completo, username, email, password } = req.body;
  try {
    // Verificar si el rol existe
    const roleCheck = await db.query('SELECT * FROM Roles WHERE id_role = $1', [id_role]);
    if (roleCheck.rows.length === 0) {
      return res.status(400).json({ message: 'El id_role proporcionado no existe' });
    }

    // Verificar username o email
    const userCheck = await db.query('SELECT * FROM Usuarios WHERE username = $1 OR email = $2', [username, email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'El nombre de usuario o email ya están en uso' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      'INSERT INTO Usuarios (id_role, nombre_completo, username, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id_usuario, username, email, activo, fecha_creacion',
      [id_role, nombre_completo, username, email, password_hash]
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al registrar el usuario', error: error.message });
  }
};

// Autenticación (Login)
const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    // Validar que usuario exista y esté activo
    const userQuery = await db.query('SELECT * FROM Usuarios WHERE username = $1', [username]);
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = userQuery.rows[0];

    if (!user.activo) {
      return res.status(403).json({ message: 'El usuario se encuentra inactivo' });
    }

    // Verificar password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar JWT
    const payload = {
      id_usuario: user.id_usuario,
      id_role: user.id_role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.status(200).json({
      message: 'Autenticación exitosa',
      token,
      usuario: {
        id_usuario: user.id_usuario,
        username: user.username,
        nombre_completo: user.nombre_completo,
        id_role: user.id_role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor durante el login', error: error.message });
  }
};

module.exports = {
  register,
  login
};
