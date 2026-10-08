const Chambre = require('../models/Chambre');
const Reservation = require('../models/Reservation');

// @GET /api/chambres
exports.listerChambres = async (req, res) => {
  try {
    const { type, disponible, minPrix, maxPrix, capacite } = req.query;
    const filtre = {};

    if (type) filtre.type = type;
    if (disponible !== undefined) filtre.disponible = disponible === 'true';
    if (capacite) filtre.capacite = { $gte: Number(capacite) };
    if (minPrix || maxPrix) {
      filtre.prixParNuit = {};
      if (minPrix) filtre.prixParNuit.$gte = Number(minPrix);
      if (maxPrix) filtre.prixParNuit.$lte = Number(maxPrix);
    }

    const chambres = await Chambre.find(filtre).sort({ prixParNuit: 1 });
    res.json({ succes: true, total: chambres.length, data: chambres });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @GET /api/chambres/disponibles?dateArrivee=&dateDepart=
exports.chambresDisponibles = async (req, res) => {
  try {
    const { dateArrivee, dateDepart, capacite } = req.query;

    if (!dateArrivee || !dateDepart) {
      return res.status(400).json({ succes: false, message: 'Dates requises.' });
    }

    const debut = new Date(dateArrivee);
    const fin = new Date(dateDepart);

    // Find rooms that have overlapping confirmed/in-progress reservations
    const reservationsOccupees = await Reservation.find({
      statut: { $in: ['confirmee', 'en_cours'] },
      $or: [
        { dateArrivee: { $lt: fin }, dateDepart: { $gt: debut } },
      ],
    }).select('chambre');

    const chambresOccupeesIds = reservationsOccupees.map((r) => r.chambre);

    const filtre = {
      _id: { $nin: chambresOccupeesIds },
      disponible: true,
    };
    if (capacite) filtre.capacite = { $gte: Number(capacite) };

    const chambres = await Chambre.find(filtre).sort({ prixParNuit: 1 });
    res.json({ succes: true, total: chambres.length, data: chambres });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @GET /api/chambres/:id
exports.obtenirChambre = async (req, res) => {
  try {
    const chambre = await Chambre.findById(req.params.id);
    if (!chambre) return res.status(404).json({ succes: false, message: 'Chambre introuvable.' });
    res.json({ succes: true, data: chambre });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @POST /api/chambres  [Admin]
exports.creerChambre = async (req, res) => {
  try {
    const chambre = await Chambre.create(req.body);
    res.status(201).json({ succes: true, data: chambre });
  } catch (err) {
    res.status(400).json({ succes: false, message: err.message });
  }
};

// @PUT /api/chambres/:id  [Admin]
exports.modifierChambre = async (req, res) => {
  try {
    const chambre = await Chambre.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!chambre) return res.status(404).json({ succes: false, message: 'Chambre introuvable.' });
    res.json({ succes: true, data: chambre });
  } catch (err) {
    res.status(400).json({ succes: false, message: err.message });
  }
};

// @DELETE /api/chambres/:id  [Admin]
exports.supprimerChambre = async (req, res) => {
  try {
    const chambre = await Chambre.findByIdAndDelete(req.params.id);
    if (!chambre) return res.status(404).json({ succes: false, message: 'Chambre introuvable.' });
    res.json({ succes: true, message: 'Chambre supprimée.' });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};
