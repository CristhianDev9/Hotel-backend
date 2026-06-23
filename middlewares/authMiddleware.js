const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(403).json({ message: 'No se proporcionó token en el header Authorization' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(403).json({ message: 'Formato de token inválido. Use: Bearer <token>' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id_usuario: decoded.id_usuario,
      id_role: decoded.id_role
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token no válido o expirado', error: error.message });
  }
};

module.exports = {
  verifyToken
};
