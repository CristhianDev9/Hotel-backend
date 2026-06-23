const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const {
  getClientes, createCliente, updateCliente, deleteCliente,
  getTiposHabitacion, createTipoHabitacion,
  getHabitaciones, createHabitacion, deleteHabitacion,
  getServicios, createServicio, deleteServicio
} = require('../controllers/catalogoController');

// Todas las rutas requieren estar autenticado
router.use(verifyToken);

// Clientes
router.get('/clientes', getClientes);
router.post('/clientes', createCliente);
router.put('/clientes/:id', updateCliente);
router.delete('/clientes/:id', deleteCliente);

// Tipos de Habitación
router.get('/tipos-habitacion', getTiposHabitacion);
router.post('/tipos-habitacion', createTipoHabitacion);

// Habitaciones
router.get('/habitaciones', getHabitaciones);
router.post('/habitaciones', createHabitacion);
router.delete('/habitaciones/:id', deleteHabitacion);

// Servicios Adicionales
router.get('/servicios', getServicios);
router.post('/servicios', createServicio);
router.delete('/servicios/:id', deleteServicio);

module.exports = router;
