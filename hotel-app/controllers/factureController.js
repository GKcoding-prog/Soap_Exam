const Facture = require('../models/Facture');
const { ErreurMetier, enregistrerPaiement } = require('../services/factureService');
const { payerFactureParCarte } = require('../services/paiementSoapService');
const { PaymentGatewayError } = require('../services/paymentSoapClient');
const { creerNotification } = require('./notificationController');

// @GET /api/factures  [Admin = all, Client = own]
exports.listerFactures = async (req, res) => {
  try {
    const filtre = req.user.role === 'admin' ? {} : { client: req.user._id };
    const { statut } = req.query;
    if (statut) filtre.statut = statut;

    const factures = await Facture.find(filtre)
      .populate('client', 'nom prenom email')
      .populate('reservation', 'dateArrivee dateDepart')
      .sort({ createdAt: -1 });

    res.json({ succes: true, total: factures.length, data: factures });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @GET /api/factures/:id
exports.obtenirFacture = async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id)
      .populate('client', 'nom prenom email telephone adresse')
      .populate({ path: 'reservation', populate: { path: 'chambre', select: 'numero type' } });

    if (!facture) return res.status(404).json({ succes: false, message: 'Facture introuvable.' });

    if (req.user.role !== 'admin' && facture.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
    }

    res.json({ succes: true, data: facture });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @PUT /api/factures/:id/payer  [Admin]
exports.payerFacture = async (req, res) => {
  try {
    const facture = await enregistrerPaiement(req.params.id, req.body.methodePaiement || 'especes');
    res.json({ succes: true, message: 'Paiement enregistré.', data: facture });
  } catch (err) {
    if (err instanceof ErreurMetier) {
      return res.status(err.statusCode).json({ succes: false, message: err.message });
    }
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @POST /api/factures/:id/payer-carte  [Admin]
// Sends the invoice to the legacy SOAP payment gateway (Spring Boot).
// Body: { cardToken }  — the token "DECLINED" simulates a refused card.
exports.payerFactureCarte = async (req, res) => {
  try {
    const { paiement, facture, reservation } = await payerFactureParCarte(req.params.id, req.body.cardToken);

    if (paiement.status === 'SUCCESS') {
      await creerNotification({
        destinataire: facture.client,
        type: 'paiement_recu',
        titre: 'Paiement reçu',
        message: `Le paiement de votre facture ${facture.numero} (${facture.montantTotal.toLocaleString('fr-FR')} ${facture.devise}) a été accepté. Transaction ${paiement.transactionId}.`,
        lien: `/factures/${facture._id}`,
      });
    }

    // 402 Payment Required: the bank declined the card
    res.status(paiement.status === 'SUCCESS' ? 200 : 402).json({
      succes: paiement.status === 'SUCCESS',
      message: paiement.status === 'SUCCESS' ? 'Paiement accepté par la passerelle.' : 'Carte refusée par la banque.',
      data: { paiement, facture, reservation },
    });
  } catch (err) {
    const { status, body } = erreurPaiementVersHttp(err);
    if (status >= 500) console.error(`[paiement SOAP] ${err.message}`);
    res.status(status).json(body);
  }
};

// Maps business and SOAP gateway errors to HTTP responses
function erreurPaiementVersHttp(err) {
  if (err instanceof ErreurMetier) {
    return { status: err.statusCode, body: { succes: false, message: err.message } };
  }
  if (err instanceof PaymentGatewayError) {
    switch (err.kind) {
      case 'FAULT':
        // soap:Client = request rejected (business rule or XSD validation);
        // soap:Server = the gateway failed internally.
        return err.faultCode === 'Client'
          ? { status: 422, body: { succes: false, type: 'PAIEMENT_REJETE', code: err.errorCode, message: err.message, details: err.details } }
          : { status: 502, body: { succes: false, type: 'ERREUR_PASSERELLE', message: err.message } };
      case 'TIMEOUT':
        return { status: 504, body: { succes: false, type: 'PASSERELLE_TIMEOUT', message: err.message } };
      default:
        return { status: 503, body: { succes: false, type: 'PASSERELLE_INDISPONIBLE', message: 'Passerelle de paiement indisponible. Réessayez plus tard.', details: [err.message] } };
    }
  }
  return { status: 500, body: { succes: false, message: err.message } };
}

// @GET /api/factures/stats  [Admin]
exports.statsFactures = async (req, res) => {
  try {
    const stats = await Facture.aggregate([
      {
        $group: {
          _id: '$statut',
          total: { $sum: '$montantTotal' },
          count: { $sum: 1 },
        },
      },
    ]);
    const totalRevenu = await Facture.aggregate([
      { $match: { statut: 'payee' } },
      { $group: { _id: null, total: { $sum: '$montantTotal' } } },
    ]);

    res.json({
      succes: true,
      data: {
        parStatut: stats,
        revenuTotal: totalRevenu[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};
