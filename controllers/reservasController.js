const db = require('../config/db');

// POST /api/reservas
const crearReserva = async (req, res) => {
  const { id_cliente, notas_adicionales, habitaciones_detalle } = req.body;
  // habitaciones_detalle: [{id_habitacion, fecha_checkin, fecha_checkout}]
  const id_usuario_registro = req.user.id_usuario;

  if (!habitaciones_detalle || habitaciones_detalle.length === 0) {
    return res.status(400).json({ message: 'Debe especificar al menos una habitación' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN'); // Iniciar Transacción Atómica

    // 1. & 2. Validar disponibilidad y fechas
    let totalCostoValidacion = 0;
    const detallesInsertar = [];

    for (const det of habitaciones_detalle) {
      const checkin = new Date(det.fecha_checkin);
      const checkout = new Date(det.fecha_checkout);
      
      if (checkout <= checkin) {
        throw new Error(`La fecha de checkout (${det.fecha_checkout}) debe ser mayor al checkin (${det.fecha_checkin}) para la hab: ${det.id_habitacion}`);
      }
      const noches = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));

      // Verificar que estado es 'Disponible' y conseguir precio base
      const habQuery = await client.query(
        `SELECT h.estado, t.precio_base_noche 
         FROM Habitaciones h 
         JOIN Tipos_Habitacion t ON h.id_tipo_habitacion = t.id_tipo_habitacion 
         WHERE h.id_habitacion = $1`, 
        [det.id_habitacion]
      );

      if (habQuery.rows.length === 0) {
        throw new Error(`La habitación ID ${det.id_habitacion} no existe`);
      }

      if (habQuery.rows[0].estado !== 'Disponible') {
        throw new Error(`La habitación ID ${det.id_habitacion} no está disponible (Estado: ${habQuery.rows[0].estado})`);
      }

      const precio = parseFloat(habQuery.rows[0].precio_base_noche);
      const subtotal = precio * noches;

      detallesInsertar.push({
        id_habitacion: det.id_habitacion,
        fecha_checkin: det.fecha_checkin,
        fecha_checkout: det.fecha_checkout,
        precio_noche_historico: precio,
        subtotal
      });
    }

    // 3. Insertar cabecera en 'Reservas'
    const resInsert = await client.query(
      'INSERT INTO Reservas (id_cliente, id_usuario_registro, notas_adicionales, estado_reserva) VALUES ($1, $2, $3, $4) RETURNING id_reserva',
      [id_cliente, id_usuario_registro, notas_adicionales, 'Pendiente']
    );
    const id_reserva = resInsert.rows[0].id_reserva;

    // 4. & 5. Insertar Detalle_Reservas y Actualizar estado de habitación a 'Ocupada'
    for (const d of detallesInsertar) {
      await client.query(
        'INSERT INTO Detalle_Reservas (id_reserva, id_habitacion, fecha_checkin, fecha_checkout, precio_noche_historico, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
        [id_reserva, d.id_habitacion, d.fecha_checkin, d.fecha_checkout, d.precio_noche_historico, d.subtotal]
      );

      await client.query(
        'UPDATE Habitaciones SET estado = $1 WHERE id_habitacion = $2',
        ['Ocupada', d.id_habitacion]
      );
    }

    await client.query('COMMIT'); // Finalizar exitosamente

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      id_reserva
    });
  } catch (error) {
    await client.query('ROLLBACK'); // Revertir cambios en caso de error
    res.status(400).json({ message: 'Error en la transacción', error: error.message });
  } finally {
    client.release(); // Liberar conexión al pool
  }
};

// GET /api/reservas/:id/estado-cuenta
const getEstadoCuenta = async (req, res) => {
  const { id } = req.params;
  try {
    // Subtotales de habitaciones
    const detQuery = await db.query('SELECT SUM(subtotal) as total_habs FROM Detalle_Reservas WHERE id_reserva = $1', [id]);
    const total_habs = parseFloat(detQuery.rows[0].total_habs || 0);

    // Subtotales de consumos
    const conQuery = await db.query('SELECT SUM(cantidad * precio_cobrado) as total_cons FROM Consumos WHERE id_reserva = $1', [id]);
    const total_cons = parseFloat(conQuery.rows[0].total_cons || 0);

    const total_cuenta = total_habs + total_cons;

    // Pagos
    const pagQuery = await db.query('SELECT SUM(monto) as total_pagos FROM Pagos WHERE id_reserva = $1', [id]);
    const total_pagos = parseFloat(pagQuery.rows[0].total_pagos || 0);

    const balance_pendiente = total_cuenta - total_pagos;

    res.json({
      id_reserva: id,
      total_habitaciones: total_habs,
      total_consumos: total_cons,
      total_cuenta,
      total_pagos,
      balance_pendiente
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/reservas/:id/checkout
const checkoutReserva = async (req, res) => {
  const { id } = req.params;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Verificar si reserva ya finalizada
    const rCheck = await client.query('SELECT estado_reserva FROM Reservas WHERE id_reserva = $1 FOR UPDATE', [id]);
    if (rCheck.rows.length === 0) throw new Error('Reserva no encontrada');
    if (rCheck.rows[0].estado_reserva === 'Finalizada') throw new Error('La reserva ya ha sido finalizada');

    // Calcular totales
    const detQuery = await client.query('SELECT SUM(subtotal) as total_habs FROM Detalle_Reservas WHERE id_reserva = $1', [id]);
    const total_habs = parseFloat(detQuery.rows[0].total_habs || 0);

    const conQuery = await client.query('SELECT SUM(cantidad * precio_cobrado) as total_cons FROM Consumos WHERE id_reserva = $1', [id]);
    const total_cons = parseFloat(conQuery.rows[0].total_cons || 0);

    const total_cuenta = total_habs + total_cons;

    const pagQuery = await client.query('SELECT SUM(monto) as total_pagos FROM Pagos WHERE id_reserva = $1', [id]);
    const total_pagos = parseFloat(pagQuery.rows[0].total_pagos || 0);

    const balance_pendiente = total_cuenta - total_pagos;

    // Redondear para evitar problemas de coma flotante
    if (Math.abs(balance_pendiente) > 0.01) {
      throw new Error(`No se puede realizar checkout. Balance pendiente: ${balance_pendiente}`);
    }

    // Actualizar estado de reserva
    await client.query('UPDATE Reservas SET estado_reserva = $1 WHERE id_reserva = $2', ['Finalizada', id]);

    // Liberar Habitaciones
    const detHabs = await client.query('SELECT id_habitacion FROM Detalle_Reservas WHERE id_reserva = $1', [id]);
    for (const row of detHabs.rows) {
      await client.query('UPDATE Habitaciones SET estado = $1 WHERE id_habitacion = $2', ['Disponible', row.id_habitacion]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Checkout exitoso. La reserva ha sido finalizada y las habitaciones liberadas.' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: 'Error durante el checkout', error: error.message });
  } finally {
    client.release();
  }
};

// GET /api/reservas - Listar todas las reservas
const getReservas = async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id_reserva,
        r.id_cliente,
        r.estado_reserva,
        to_char(r.fecha_creacion, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_creacion,
        r.notas_adicionales,
        c.nombre_completo AS nombre_cliente,
        c.email,
        COALESCE(COUNT(dr.id_habitacion), 0) as total_habitaciones,
        COALESCE(SUM(dr.subtotal), 0) as total_costo,
        COALESCE(
          json_agg(
            json_build_object(
              'id_habitacion', dr.id_habitacion,
              'numero_habitacion', h.numero_habitacion,
              'fecha_checkin', to_char(dr.fecha_checkin, 'YYYY-MM-DD'),
              'fecha_checkout', to_char(dr.fecha_checkout, 'YYYY-MM-DD')
            )
          ) FILTER (WHERE dr.id_habitacion IS NOT NULL),
          '[]'
        ) as habitaciones_detalle
      FROM Reservas r
      LEFT JOIN Clientes c ON r.id_cliente = c.id_cliente
      LEFT JOIN Detalle_Reservas dr ON r.id_reserva = dr.id_reserva
      LEFT JOIN Habitaciones h ON dr.id_habitacion = h.id_habitacion
      GROUP BY r.id_reserva, r.id_cliente, r.estado_reserva, r.fecha_creacion, r.notas_adicionales, c.nombre_completo, c.email
      ORDER BY r.fecha_creacion DESC
    `;

    const result = await db.query(query);

    res.json({
      message: 'Reservas obtenidas exitosamente',
      total: result.rows.length,
      reservas: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/reservas/:id - Actualizar estado_reserva y/o notas_adicionales
const updateReserva = async (req, res) => {
  const { id } = req.params;
  const { estado_reserva, notas_adicionales } = req.body;

  if (estado_reserva === undefined && notas_adicionales === undefined) {
    return res.status(400).json({ message: 'Debe enviar al menos uno de: estado_reserva, notas_adicionales' });
  }

  try {
    // Actualizar campos proporcionados
    const updQuery = `
      UPDATE Reservas
      SET estado_reserva = COALESCE($1, estado_reserva),
          notas_adicionales = COALESCE($2, notas_adicionales)
      WHERE id_reserva = $3
      RETURNING id_reserva
    `;

    const updRes = await db.query(updQuery, [estado_reserva || null, notas_adicionales || null, id]);
    if (updRes.rows.length === 0) return res.status(404).json({ message: 'Reserva no encontrada' });

    // Recuperar la reserva en formato consistente (incluye habitaciones)
    const fetchQuery = `
      SELECT 
        r.id_reserva,
        r.id_cliente,
        r.estado_reserva,
        to_char(r.fecha_creacion, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_creacion,
        r.notas_adicionales,
        c.nombre_completo AS nombre_cliente,
        c.email,
        COALESCE(COUNT(dr.id_habitacion), 0) as total_habitaciones,
        COALESCE(SUM(dr.subtotal), 0) as total_costo,
        COALESCE(
          json_agg(
            json_build_object(
              'id_habitacion', dr.id_habitacion,
              'numero_habitacion', h.numero_habitacion,
              'fecha_checkin', to_char(dr.fecha_checkin, 'YYYY-MM-DD'),
              'fecha_checkout', to_char(dr.fecha_checkout, 'YYYY-MM-DD')
            )
          ) FILTER (WHERE dr.id_habitacion IS NOT NULL),
          '[]'
        ) as habitaciones_detalle
      FROM Reservas r
      LEFT JOIN Clientes c ON r.id_cliente = c.id_cliente
      LEFT JOIN Detalle_Reservas dr ON r.id_reserva = dr.id_reserva
      LEFT JOIN Habitaciones h ON dr.id_habitacion = h.id_habitacion
      WHERE r.id_reserva = $1
      GROUP BY r.id_reserva, r.id_cliente, r.estado_reserva, r.fecha_creacion, r.notas_adicionales, c.nombre_completo, c.email
    `;

    const fetched = await db.query(fetchQuery, [id]);
    const reserva = fetched.rows[0] || null;

    res.json({ message: 'Reserva actualizada', reserva });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteReserva = async (req, res) => {
  const { id } = req.params;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const rCheck = await client.query('SELECT estado_reserva FROM Reservas WHERE id_reserva = $1 FOR UPDATE', [id]);
    if (rCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const currentState = rCheck.rows[0].estado_reserva;
    if (currentState === 'Finalizada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No se puede cancelar una reserva finalizada' });
    }

    // Marcar como Cancelada
    await client.query('UPDATE Reservas SET estado_reserva = $1 WHERE id_reserva = $2', ['Cancelada', id]);

    // Liberar habitaciones asociadas
    const detHabs = await client.query('SELECT id_habitacion FROM Detalle_Reservas WHERE id_reserva = $1', [id]);
    for (const row of detHabs.rows) {
      await client.query('UPDATE Habitaciones SET estado = $1 WHERE id_habitacion = $2', ['Disponible', row.id_habitacion]);
    }

    // Recuperar reserva actualizada con detalle de habitaciones
    const fetchQuery = `
      SELECT 
        r.id_reserva,
        r.id_cliente,
        r.estado_reserva,
        to_char(r.fecha_creacion, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_creacion,
        r.notas_adicionales,
        c.nombre_completo AS nombre_cliente,
        c.email,
        COALESCE(COUNT(dr.id_habitacion), 0) as total_habitaciones,
        COALESCE(SUM(dr.subtotal), 0) as total_costo,
        COALESCE(
          json_agg(
            json_build_object(
              'id_habitacion', dr.id_habitacion,
              'numero_habitacion', h.numero_habitacion,
              'fecha_checkin', to_char(dr.fecha_checkin, 'YYYY-MM-DD'),
              'fecha_checkout', to_char(dr.fecha_checkout, 'YYYY-MM-DD')
            )
          ) FILTER (WHERE dr.id_habitacion IS NOT NULL),
          '[]'
        ) as habitaciones_detalle
      FROM Reservas r
      LEFT JOIN Clientes c ON r.id_cliente = c.id_cliente
      LEFT JOIN Detalle_Reservas dr ON r.id_reserva = dr.id_reserva
      LEFT JOIN Habitaciones h ON dr.id_habitacion = h.id_habitacion
      WHERE r.id_reserva = $1
      GROUP BY r.id_reserva, r.id_cliente, r.estado_reserva, r.fecha_creacion, r.notas_adicionales, c.nombre_completo, c.email
    `;

    const fetched = await client.query(fetchQuery, [id]);
    const reserva = fetched.rows[0] || null;

    await client.query('COMMIT');
    res.json({ message: 'Reserva cancelada correctamente', reserva });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  crearReserva,
  getReservas,
  getEstadoCuenta,
  checkoutReserva,
  updateReserva,
  deleteReserva
};
