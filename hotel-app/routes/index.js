const express = require('express');
const router = express.Router();

const { proteger, adminSeulement } = require('../middleware/auth');

// Controllers
const auth = require('../controllers/authController');
const chambre = require('../controllers/chambreController');
const reservation = require('../controllers/reservationController');
const service = require('../controllers/serviceController');
const facture = require('../controllers/factureController');
const client = require('../controllers/clientController');
const notif = require('../controllers/notificationController');

// ─── AUTH ────────────────────────────────────────────────────
router.post('/auth/inscription', auth.inscription);
router.post('/auth/connexion', auth.connexion);
router.get('/auth/moi', proteger, auth.moi);
router.put('/auth/moi', proteger, auth.modifierProfil);

// ─── CHAMBRES ────────────────────────────────────────────────
router.get('/chambres/disponibles', chambre.chambresDisponibles);        // Public
router.get('/chambres', chambre.listerChambres);                          // Public
router.get('/chambres/:id', chambre.obtenirChambre);                      // Public
router.post('/chambres', proteger, adminSeulement, chambre.creerChambre);
router.put('/chambres/:id', proteger, adminSeulement, chambre.modifierChambre);
router.delete('/chambres/:id', proteger, adminSeulement, chambre.supprimerChambre);

// ─── SERVICES ────────────────────────────────────────────────
router.get('/services', proteger, service.listerServices);
router.get('/services/:id', proteger, service.obtenirService);
router.post('/services', proteger, adminSeulement, service.creerService);
router.put('/services/:id', proteger, adminSeulement, service.modifierService);
router.delete('/services/:id', proteger, adminSeulement, service.supprimerService);

// ─── RÉSERVATIONS ────────────────────────────────────────────
router.post('/reservations', proteger, reservation.creerReservation);
router.get('/reservations', proteger, reservation.listerReservations);
router.get('/reservations/:id', proteger, reservation.obtenirReservation);
router.put('/reservations/:id/checkin', proteger, adminSeulement, reservation.checkin);
router.put('/reservations/:id/checkout', proteger, adminSeulement, reservation.checkout);
router.post('/reservations/:id/services', proteger, reservation.ajouterService);
router.post('/reservations/:id/evaluation', proteger, reservation.evaluerSejour);
router.put('/reservations/:id/annuler', proteger, reservation.annulerReservation);

// ─── FACTURES ────────────────────────────────────────────────
router.get('/factures/stats', proteger, adminSeulement, facture.statsFactures);
router.get('/factures', proteger, facture.listerFactures);
router.get('/factures/:id', proteger, facture.obtenirFacture);
router.put('/factures/:id/payer', proteger, adminSeulement, facture.payerFacture);
router.post('/factures/:id/payer-carte', proteger, adminSeulement, facture.payerFactureCarte); // SOAP gateway

// ─── CLIENTS (Admin) ─────────────────────────────────────────
router.get('/clients', proteger, adminSeulement, client.listerClients);
router.get('/clients/:id', proteger, adminSeulement, client.obtenirClient);
router.get('/clients/:id/historique', proteger, client.historiqueClient);
router.put('/clients/:id', proteger, adminSeulement, client.modifierClient);

// ─── NOTIFICATIONS ───────────────────────────────────────────
router.get('/notifications', proteger, notif.mesNotifications);
router.put('/notifications/tout-lire', proteger, notif.toutMarquerLu);
router.put('/notifications/:id/lire', proteger, notif.marquerLue);

module.exports = router;
