const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const {
  getRoles,
  createRole,
  updateRole,
  deleteRole
} = require('../controllers/rolesController');

// Todas las rutas requieren estar autenticado
router.use(verifyToken);

router.get('/roles', getRoles);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

module.exports = router;
