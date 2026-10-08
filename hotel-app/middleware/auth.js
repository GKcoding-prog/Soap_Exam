const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
exports.proteger = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ succes: false, message: 'Accès refusé. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user || !req.user.actif) {
      return res.status(401).json({ succes: false, message: 'Utilisateur introuvable ou inactif.' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ succes: false, message: 'Token invalide.' });
  }
};

// Restrict to admin only
exports.adminSeulement = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ succes: false, message: 'Accès réservé aux administrateurs.' });
  }
  next();
};

// Allow owner or admin
exports.proprietaireOuAdmin = (paramId) => (req, res, next) => {
  const resourceId = req.params[paramId];
  if (req.user.role === 'admin' || req.user._id.toString() === resourceId) {
    return next();
  }
  return res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
};
