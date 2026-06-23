const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const {
  registrarConsumo, getConsumosByReserva,
  registrarPago, getPagosByReserva
} = require('../controllers/consumosPagosController');

router.use(verifyToken);

// Consumos
router.post('/consumos', registrarConsumo);
router.get('/consumos/reserva/:id', getConsumosByReserva);

// Pagos
router.post('/pagos', registrarPago);
router.get('/pagos/reserva/:id', getPagosByReserva);

module.exports = router;
