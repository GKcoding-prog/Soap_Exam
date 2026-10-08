const User = require('../models/User');
const Reservation = require('../models/Reservation');

// @GET /api/clients  [Admin]
exports.listerClients = async (req, res) => {
  try {
    const clients = await User.find({ role: 'client' }).sort({ createdAt: -1 });
    res.json({ succes: true, total: clients.length, data: clients });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @GET /api/clients/:id  [Admin]
exports.obtenirClient = async (req, res) => {
  try {
    const client = await User.findById(req.params.id);
    if (!client || client.role !== 'client') {
      return res.status(404).json({ succes: false, message: 'Client introuvable.' });
    }
    res.json({ succes: true, data: client });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @GET /api/clients/:id/historique  [Admin or own client]
exports.historiqueClient = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
    }

    const reservations = await Reservation.find({ client: req.params.id })
      .populate('chambre', 'numero type prixParNuit')
      .populate('servicesConsommes.service', 'nom prix')
      .sort({ dateArrivee: -1 });

    res.json({ succes: true, total: reservations.length, data: reservations });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @PUT /api/clients/:id  [Admin]
exports.modifierClient = async (req, res) => {
  try {
    const { nom, prenom, telephone, adresse, actif } = req.body;
    const client = await User.findByIdAndUpdate(
      req.params.id,
      { nom, prenom, telephone, adresse, actif },
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ succes: false, message: 'Client introuvable.' });
    res.json({ succes: true, data: client });
  } catch (err) {
    res.status(400).json({ succes: false, message: err.message });
  }
};
