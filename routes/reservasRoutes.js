const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const {
  crearReserva, getEstadoCuenta, checkoutReserva
} = require('../controllers/reservasController');

router.use(verifyToken);

router.post('/reservas', crearReserva);
router.get('/reservas/:id/estado-cuenta', getEstadoCuenta);
router.post('/reservas/:id/checkout', checkoutReserva);

module.exports = router;
