const mongoose = require('mongoose');
const Facture = require('../models/Facture');
const Reservation = require('../models/Reservation');

// Business error carrying the HTTP status the controller should answer with
class ErreurMetier extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'ErreurMetier';
    this.statusCode = statusCode;
  }
}

const trouverFacture = async (id) => {
  const facture = mongoose.isValidObjectId(id) ? await Facture.findById(id) : null;
  if (!facture) throw new ErreurMetier('Facture introuvable.', 404);
  return facture;
};

// Throws if the invoice cannot be paid
const verifierPayable = (facture) => {
  if (facture.statut === 'payee') {
    throw new ErreurMetier(`Facture déjà payée${facture.transactionId ? ` (transaction ${facture.transactionId})` : ''}.`, 400);
  }
  if (facture.statut === 'annulee') {
    throw new ErreurMetier('Facture annulée.', 400);
  }
};

// Marks the invoice as paid (shared by manual payment and card payment)
const marquerPayee = (facture, methodePaiement, datePaiement = new Date()) => {
  facture.statut = 'payee';
  facture.methodePaiement = methodePaiement;
  facture.datePaiement = datePaiement;
};

// Closes the reservation once its invoice is paid (terminee -> cloturee)
const cloturerReservation = async (reservationId) => {
  const reservation = await Reservation.findById(reservationId);
  if (reservation && reservation.statut === 'terminee') {
    reservation.statut = 'cloturee';
    await reservation.save();
  }
  return reservation;
};

// Manual payment recorded at the desk (cash, transfer...)
const enregistrerPaiement = async (id, methodePaiement = 'especes') => {
  const facture = await trouverFacture(id);
  verifierPayable(facture);
  marquerPayee(facture, methodePaiement);
  await facture.save();
  await cloturerReservation(facture.reservation);
  return facture;
};

/**
 * Stores the result of a card payment returned by the SOAP gateway.
 * Every attempt is logged; on SUCCESS the invoice becomes paid, keeps the
 * gateway transactionId and receipt, and the reservation is closed.
 *
 * @param paiement JSON object mapped from the SOAP response by paymentSoapClient
 */
const enregistrerPaiementCarte = async (facture, paiement) => {
  facture.tentativesPaiement.push({
    transactionId: paiement.transactionId,
    statut: paiement.status,
    codeAutorisation: paiement.authorizationCode,
    date: paiement.issueDate,
  });

  let reservation = null;
  if (paiement.status === 'SUCCESS') {
    marquerPayee(facture, 'carte', paiement.issueDate);
    facture.transactionId = paiement.transactionId;
    facture.codeAutorisation = paiement.authorizationCode;
    facture.recuXml = paiement.receiptXmlData;
  }
  await facture.save();
  if (paiement.status === 'SUCCESS') {
    reservation = await cloturerReservation(facture.reservation);
  }
  return { facture, reservation };
};

module.exports = {
  ErreurMetier,
  trouverFacture,
  verifierPayable,
  enregistrerPaiement,
  enregistrerPaiementCarte,
};
