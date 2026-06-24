const db = require('../config/db');

// ===== CLIENTES =====
const getClientes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Clientes ORDER BY id_cliente ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCliente = async (req, res) => {
  const { documento_identidad, nombre_completo, email, telefono } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO Clientes (documento_identidad, nombre_completo, email, telefono) VALUES ($1, $2, $3, $4) RETURNING *',
      [documento_identidad, nombre_completo, email, telefono]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCliente = async (req, res) => {
  const { id } = req.params;
  const { documento_identidad, nombre_completo, email, telefono } = req.body;
  try {
    const result = await db.query(
      'UPDATE Clientes SET documento_identidad=$1, nombre_completo=$2, email=$3, telefono=$4 WHERE id_cliente=$5 RETURNING *',
      [documento_identidad, nombre_completo, email, telefono, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCliente = async (req, res) => {
  const { id } = req.params;
  try {
    // Regla de Restricción
    const checkRes = await db.query('SELECT id_reserva FROM Reservas WHERE id_cliente = $1', [id]);
    if (checkRes.rows.length > 0) {
      return res.status(409).json({ message: 'No se puede eliminar: el cliente tiene reservas asociadas' });
    }
    const result = await db.query('DELETE FROM Clientes WHERE id_cliente = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===== TIPOS DE HABITACION =====
const getTiposHabitacion = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Tipos_Habitacion');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createTipoHabitacion = async (req, res) => {
  const { nombre_tipo, capacidad_maxima, precio_base_noche } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO Tipos_Habitacion (nombre_tipo, capacidad_maxima, precio_base_noche) VALUES ($1, $2, $3) RETURNING *',
      [nombre_tipo, capacidad_maxima, precio_base_noche]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===== HABITACIONES =====
const getHabitaciones = async (req, res) => {
  const { estado } = req.query;
  try {
    let query = 'SELECT h.*, t.nombre_tipo, t.precio_base_noche FROM Habitaciones h JOIN Tipos_Habitacion t ON h.id_tipo_habitacion = t.id_tipo_habitacion';
    const params = [];
    if (estado) {
      query += ' WHERE h.estado = $1';
      params.push(estado);
    }
    query += ' ORDER BY h.id_habitacion ASC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createHabitacion = async (req, res) => {
  const { numero_habitacion, id_tipo_habitacion, estado } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO Habitaciones (numero_habitacion, id_tipo_habitacion, estado) VALUES ($1, $2, COALESCE($3, \'Disponible\')) RETURNING *',
      [numero_habitacion, id_tipo_habitacion, estado]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateHabitacion = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  try {
    if (!estado) {
      return res.status(400).json({ message: 'El estado es requerido' });
    }
    const result = await db.query(
      'UPDATE Habitaciones SET estado = $1 WHERE id_habitacion = $2 RETURNING *',
      [estado, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }
    res.json({ 
      message: 'Estado de habitación actualizado correctamente',
      habitacion: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteHabitacion = async (req, res) => {
  const { id } = req.params;
  try {
    // Regla de Restricción
    const checkDet = await db.query('SELECT id_detalle FROM Detalle_Reservas WHERE id_habitacion = $1', [id]);
    if (checkDet.rows.length > 0) {
      return res.status(409).json({ message: 'No se puede eliminar: la habitación tiene historial de reservas' });
    }
    const result = await db.query('DELETE FROM Habitaciones WHERE id_habitacion = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Habitación no encontrada' });
    res.json({ message: 'Habitación eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===== SERVICIOS ADICIONALES =====
const getServicios = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Servicios_Adicionales');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createServicio = async (req, res) => {
  const { nombre_servicio, descripcion, precio_actual } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO Servicios_Adicionales (nombre_servicio, descripcion, precio_actual) VALUES ($1, $2, $3) RETURNING *',
      [nombre_servicio, descripcion, precio_actual]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteServicio = async (req, res) => {
  const { id } = req.params;
  try {
    const checkCon = await db.query('SELECT id_consumo FROM Consumos WHERE id_servicio = $1', [id]);
    if (checkCon.rows.length > 0) {
      return res.status(409).json({ message: 'No se puede eliminar: el servicio tiene consumos registrados' });
    }
    const result = await db.query('DELETE FROM Servicios_Adicionales WHERE id_servicio = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Servicio no encontrado' });
    res.json({ message: 'Servicio eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getClientes, createCliente, updateCliente, deleteCliente,
  getTiposHabitacion, createTipoHabitacion,
  getHabitaciones, createHabitacion, updateHabitacion, deleteHabitacion,
  getServicios, createServicio, deleteServicio
};
