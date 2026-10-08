const Service = require('../models/Service');

// @GET /api/services
exports.listerServices = async (req, res) => {
  try {
    const { categorie, disponible } = req.query;
    const filtre = {};
    if (categorie) filtre.categorie = categorie;
    if (disponible !== undefined) filtre.disponible = disponible === 'true';

    const services = await Service.find(filtre).sort({ categorie: 1, nom: 1 });
    res.json({ succes: true, total: services.length, data: services });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @GET /api/services/:id
exports.obtenirService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ succes: false, message: 'Service introuvable.' });
    res.json({ succes: true, data: service });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @POST /api/services  [Admin]
exports.creerService = async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json({ succes: true, data: service });
  } catch (err) {
    res.status(400).json({ succes: false, message: err.message });
  }
};

// @PUT /api/services/:id  [Admin]
exports.modifierService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!service) return res.status(404).json({ succes: false, message: 'Service introuvable.' });
    res.json({ succes: true, data: service });
  } catch (err) {
    res.status(400).json({ succes: false, message: err.message });
  }
};

// @DELETE /api/services/:id  [Admin]
exports.supprimerService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ succes: false, message: 'Service introuvable.' });
    res.json({ succes: true, message: 'Service supprimé.' });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};
