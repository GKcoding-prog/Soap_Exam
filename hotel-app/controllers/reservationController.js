const Reservation = require('../models/Reservation');
const Chambre = require('../models/Chambre');
const Service = require('../models/Service');
const Facture = require('../models/Facture');
const { creerNotification } = require('./notificationController');

// Helper: check availability (with optional excludeId for updates)
const verifierDisponibilite = async (chambreId, dateArrivee, dateDepart, excludeId = null) => {
  const query = {
    chambre: chambreId,
    statut: { $in: ['confirmee', 'en_cours'] },
    $or: [{ dateArrivee: { $lt: dateDepart }, dateDepart: { $gt: dateArrivee } }],
  };
  if (excludeId) query._id = { $ne: excludeId };
  const conflit = await Reservation.findOne(query);
  return !conflit;
};

// @POST /api/reservations
exports.creerReservation = async (req, res) => {
  try {
    const { chambreId, dateArrivee, dateDepart, nombrePersonnes, notes } = req.body;

    const chambre = await Chambre.findById(chambreId);
    if (!chambre) return res.status(404).json({ succes: false, message: 'Chambre introuvable.' });
    if (!chambre.disponible) return res.status(400).json({ succes: false, message: 'Chambre indisponible.' });

    const debut = new Date(dateArrivee);
    const fin = new Date(dateDepart);

    if (fin <= debut) {
      return res.status(400).json({ succes: false, message: 'La date de départ doit être après l\'arrivée.' });
    }

    const disponible = await verifierDisponibilite(chambreId, debut, fin);
    if (!disponible) {
      return res.status(409).json({ succes: false, message: 'Chambre déjà réservée pour ces dates.' });
    }

    const nuits = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));

    const reservation = await Reservation.create({
      client: req.user._id,
      chambre: chambreId,
      dateArrivee: debut,
      dateDepart: fin,
      nombrePersonnes,
      notes,
      statut: 'confirmee',
      prixChambre: chambre.prixParNuit,
      prixServices: 0,
      prixTotal: chambre.prixParNuit * nuits,
    });

    await reservation.populate(['client', 'chambre']);

    await creerNotification({
      destinataire: req.user._id,
      type: 'reservation_confirmee',
      titre: 'Réservation confirmée',
      message: `Votre réservation pour la chambre ${chambre.numero} du ${debut.toLocaleDateString('fr-FR')} au ${fin.toLocaleDateString('fr-FR')} est confirmée.`,
      lien: `/reservations/${reservation._id}`,
    });

    res.status(201).json({ succes: true, data: reservation });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @GET /api/reservations  [Admin = all, Client = own]
exports.listerReservations = async (req, res) => {
  try {
    const filtre = req.user.role === 'admin' ? {} : { client: req.user._id };
    const { statut } = req.query;
    if (statut) filtre.statut = statut;

    const reservations = await Reservation.find(filtre)
      .populate('client', 'nom prenom email')
      .populate('chambre', 'numero type prixParNuit')
      .populate('servicesConsommes.service', 'nom prix')
      .sort({ createdAt: -1 });

    res.json({ succes: true, total: reservations.length, data: reservations });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @GET /api/reservations/:id
exports.obtenirReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('client', 'nom prenom email telephone')
      .populate('chambre')
      .populate('servicesConsommes.service');

    if (!reservation) return res.status(404).json({ succes: false, message: 'Réservation introuvable.' });

    // Client can only see own reservations
    if (req.user.role !== 'admin' && reservation.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
    }

    res.json({ succes: true, data: reservation });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @PUT /api/reservations/:id/checkin  [Admin]
exports.checkin = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ succes: false, message: 'Réservation introuvable.' });
    if (reservation.statut !== 'confirmee') {
      return res.status(400).json({ succes: false, message: 'La réservation doit être confirmée pour le check-in.' });
    }
    reservation.statut = 'en_cours';
    await reservation.save();
    res.json({ succes: true, message: 'Check-in effectué.', data: reservation });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @PUT /api/reservations/:id/checkout  [Admin]
exports.checkout = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('chambre');
    if (!reservation) return res.status(404).json({ succes: false, message: 'Réservation introuvable.' });
    if (reservation.statut !== 'en_cours') {
      return res.status(400).json({ succes: false, message: 'Le séjour doit être en cours.' });
    }

    reservation.statut = 'terminee';
    await reservation.save();

    // Generate invoice automatically
    const nuits = Math.ceil((reservation.dateDepart - reservation.dateArrivee) / (1000 * 60 * 60 * 24));
    const lignes = [
      {
        description: `Chambre ${reservation.chambre.numero} (${reservation.chambre.type}) — ${nuits} nuit(s)`,
        quantite: nuits,
        prixUnitaire: reservation.prixChambre,
        total: reservation.prixChambre * nuits,
      },
      ...reservation.servicesConsommes.map((s) => ({
        description: `Service: ${s.service?.nom || 'Service'}`,
        quantite: s.quantite,
        prixUnitaire: s.prixUnitaire,
        total: s.prixUnitaire * s.quantite,
      })),
    ];

    const sousTotal = lignes.reduce((sum, l) => sum + l.total, 0);

    const facture = await Facture.create({
      reservation: reservation._id,
      client: reservation.client,
      lignes,
      sousTotal,
    });

    await creerNotification({
      destinataire: reservation.client,
      type: 'facture_generee',
      titre: 'Facture disponible',
      message: `Votre facture ${facture.numero} d'un montant de ${facture.montantTotal.toLocaleString('fr-FR')} BIF est disponible.`,
      lien: `/factures/${facture._id}`,
    });

    res.json({ succes: true, message: 'Check-out effectué. Facture générée.', data: { reservation, facture } });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @POST /api/reservations/:id/services  [Admin or Client in-stay]
exports.ajouterService = async (req, res) => {
  try {
    const { serviceId, quantite = 1, notes } = req.body;

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ succes: false, message: 'Réservation introuvable.' });
    if (reservation.statut !== 'en_cours') {
      return res.status(400).json({ succes: false, message: 'Le séjour doit être en cours pour ajouter des services.' });
    }
    if (req.user.role !== 'admin' && reservation.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.disponible) {
      return res.status(404).json({ succes: false, message: 'Service introuvable ou indisponible.' });
    }

    reservation.servicesConsommes.push({
      service: serviceId,
      quantite,
      prixUnitaire: service.prix,
      notes,
    });

    await reservation.save();
    await reservation.populate('servicesConsommes.service');
    res.json({ succes: true, data: reservation });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @POST /api/reservations/:id/evaluation  [Client]
exports.evaluerSejour = async (req, res) => {
  try {
    const { note, commentaire } = req.body;

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ succes: false, message: 'Réservation introuvable.' });
    if (!['terminee', 'cloturee'].includes(reservation.statut)) {
      return res.status(400).json({ succes: false, message: 'Le séjour doit être terminé pour être évalué.' });
    }
    if (reservation.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
    }
    if (reservation.evaluation?.note) {
      return res.status(400).json({ succes: false, message: 'Séjour déjà évalué.' });
    }

    reservation.evaluation = { note, commentaire };
    await reservation.save();
    res.json({ succes: true, data: reservation });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @PUT /api/reservations/:id/annuler
exports.annulerReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ succes: false, message: 'Réservation introuvable.' });

    if (!['en_attente', 'confirmee'].includes(reservation.statut)) {
      return res.status(400).json({ succes: false, message: 'Impossible d\'annuler cette réservation.' });
    }
    if (req.user.role !== 'admin' && reservation.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
    }

    reservation.statut = 'annulee';
    await reservation.save();
    res.json({ succes: true, message: 'Réservation annulée.', data: reservation });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};
