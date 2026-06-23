const db = require('../config/db');

// POST /api/consumos
const registrarConsumo = async (req, res) => {
  const { id_reserva, id_servicio, cantidad = 1 } = req.body;
  try {
    // Obtener precio actual del servicio
    const srvResult = await db.query('SELECT precio_actual FROM Servicios_Adicionales WHERE id_servicio = $1', [id_servicio]);
    if (srvResult.rows.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    const precio_cobrado = srvResult.rows[0].precio_actual;

    const result = await db.query(
      'INSERT INTO Consumos (id_reserva, id_servicio, cantidad, precio_cobrado) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_reserva, id_servicio, cantidad, precio_cobrado]
    );

    res.status(201).json({
      message: 'Consumo registrado exitosamente',
      consumo: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/consumos/reserva/:id
const getConsumosByReserva = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT c.*, s.nombre_servicio 
       FROM Consumos c 
       JOIN Servicios_Adicionales s ON c.id_servicio = s.id_servicio 
       WHERE c.id_reserva = $1 ORDER BY c.fecha_consumo ASC`, 
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/pagos
const registrarPago = async (req, res) => {
  const { id_reserva, monto, metodo_pago } = req.body;
  const id_usuario_cajero = req.user.id_usuario; // Inyectado por el verifyToken

  // Validar metodo pago
  const metodosValidos = ['Efectivo', 'Tarjeta de Credito', 'Transferencia'];
  if (!metodosValidos.includes(metodo_pago)) {
    return res.status(400).json({ message: 'Método de pago no válido' });
  }

  try {
    const result = await db.query(
      'INSERT INTO Pagos (id_reserva, id_usuario_cajero, monto, metodo_pago) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_reserva, id_usuario_cajero, monto, metodo_pago]
    );

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      pago: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/pagos/reserva/:id
const getPagosByReserva = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM Pagos WHERE id_reserva = $1 ORDER BY fecha_pago ASC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registrarConsumo,
  getConsumosByReserva,
  registrarPago,
  getPagosByReserva
};
