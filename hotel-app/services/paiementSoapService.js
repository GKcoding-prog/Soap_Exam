const { processPaymentAndGenerateReceipt } = require('./paymentSoapClient');
const factureService = require('./factureService');

/**
 * Adapter between the SOAP payment gateway and the hotel application.
 *
 * It holds no business rules: factureService decides whether the invoice can
 * be paid, the gateway processes the payment, then factureService persists
 * the mapped result in MongoDB (Facture + Reservation).
 */
const payerFactureParCarte = async (factureId, cardToken) => {
  if (!cardToken) {
    throw new factureService.ErreurMetier('cardToken est requis.', 400);
  }

  const facture = await factureService.trouverFacture(factureId);
  factureService.verifierPayable(facture);

  // PaymentGatewayError (FAULT / UNAVAILABLE / TIMEOUT) propagates to the
  // controller, leaving the invoice and reservation unchanged.
  const paiement = await processPaymentAndGenerateReceipt({
    reservationId: facture.reservation.toString(),
    amount: facture.montantTotal.toFixed(2), // xs:decimal, fractionDigits = 2
    currency: facture.devise,
    cardToken: String(cardToken),
  });

  const { facture: factureMaj, reservation } = await factureService.enregistrerPaiementCarte(facture, paiement);
  return { paiement, facture: factureMaj, reservation };
};

module.exports = { payerFactureParCarte };
