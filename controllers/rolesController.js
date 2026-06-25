const db = require('../config/db');

// GET /api/roles - Listar todos los roles
const getRoles = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Roles ORDER BY id_role ASC');
    res.json({
      message: 'Roles obtenidos exitosamente',
      total: result.rows.length,
      roles: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/roles - Crear un nuevo rol
const createRole = async (req, res) => {
  const { nombre_rol, descripcion } = req.body;
  try {
    if (!nombre_rol) {
      return res.status(400).json({ message: 'El nombre del rol es requerido' });
    }

    // Verificar si el rol ya existe
    const checkRole = await db.query('SELECT id_role FROM Roles WHERE nombre_rol = $1', [nombre_rol]);
    if (checkRole.rows.length > 0) {
      return res.status(409).json({ message: 'El rol ya existe' });
    }

    const result = await db.query(
      'INSERT INTO Roles (nombre_rol, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre_rol, descripcion || null]
    );
    res.status(201).json({
      message: 'Rol creado exitosamente',
      rol: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/roles/:id - Actualizar un rol
const updateRole = async (req, res) => {
  const { id } = req.params;
  const { nombre_rol, descripcion } = req.body;
  try {
    if (!nombre_rol) {
      return res.status(400).json({ message: 'El nombre del rol es requerido' });
    }

    // Verificar si el rol existe
    const checkRole = await db.query('SELECT id_role FROM Roles WHERE id_role = $1', [id]);
    if (checkRole.rows.length === 0) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    // Verificar si el nuevo nombre ya está siendo usado por otro rol
    const checkDuplicate = await db.query(
      'SELECT id_role FROM Roles WHERE nombre_rol = $1 AND id_role != $2',
      [nombre_rol, id]
    );
    if (checkDuplicate.rows.length > 0) {
      return res.status(409).json({ message: 'El nombre del rol ya está siendo usado' });
    }

    const result = await db.query(
      'UPDATE Roles SET nombre_rol = $1, descripcion = $2 WHERE id_role = $3 RETURNING *',
      [nombre_rol, descripcion || null, id]
    );

    res.json({
      message: 'Rol actualizado exitosamente',
      rol: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/roles/:id - Eliminar un rol
const deleteRole = async (req, res) => {
  const { id } = req.params;
  try {
    // Verificar si el rol tiene usuarios asociados
    const checkUsers = await db.query('SELECT id_usuario FROM Usuarios WHERE id_role = $1', [id]);
    if (checkUsers.rows.length > 0) {
      return res.status(409).json({ message: 'No se puede eliminar: el rol tiene usuarios asociados' });
    }

    const result = await db.query('DELETE FROM Roles WHERE id_role = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    res.json({ message: 'Rol eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole
};
