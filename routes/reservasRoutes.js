const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const {
  crearReserva, getReservas, getEstadoCuenta, checkoutReserva
} = require('../controllers/reservasController');
const { updateReserva } = require('../controllers/reservasController');

// GET sin autenticación para listar reservas
router.get('/reservas', getReservas);

// Resto de rutas con autenticación
router.use(verifyToken);

router.post('/reservas', crearReserva);
router.patch('/reservas/:id', updateReserva);
router.get('/reservas/:id/estado-cuenta', getEstadoCuenta);
router.post('/reservas/:id/checkout', checkoutReserva);

module.exports = router;
