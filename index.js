require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const catalogoRoutes = require('./routes/catalogoRoutes');
const reservasRoutes = require('./routes/reservasRoutes');
const consumosPagosRoutes = require('./routes/consumosPagosRoutes');
const rolesRoutes = require('./routes/rolesRoutes');

const app = express();

// Middlewares de seguridad y parseo
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api', catalogoRoutes);
app.use('/api', reservasRoutes);
app.use('/api', consumosPagosRoutes);
app.use('/api', rolesRoutes);

// Endpoint de prueba
app.get('/', (req, res) => {
  res.send('API REST del Sistema de Gestión de Reservas Hoteleras funcionando correctamente.');
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
