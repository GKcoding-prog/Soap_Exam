const { processPaymentAndGenerateReceipt } = require('./paymentSoapClient');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Adapter layer: validates the REST input, calls the SOAP gateway, and hands
 * the result to the existing application services. SOAP transport details
 * stay in paymentSoapClient.js; reservation/invoice rules stay in their own
 * services and models.
 */
async function completeReservationPayment({ reservationId, amount, currency, cardToken } = {}) {
  const numericAmount = Number(amount);
  if (!reservationId || !currency || !cardToken || amount === undefined) {
    throw new ValidationError('reservationId, amount, currency and cardToken are required');
  }
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new ValidationError('amount must be a positive number');
  }

  // PaymentGatewayError (FAULT / UNAVAILABLE / TIMEOUT) propagates to the route.
  const payment = await processPaymentAndGenerateReceipt({
    reservationId: String(reservationId),
    amount: numericAmount.toFixed(2),
    currency: String(currency).trim().toUpperCase(),
    cardToken: String(cardToken)
  });

  // TODO: if payment.status === 'SUCCESS', call the existing Reservation and
  // Invoice services (mark the reservation as paid, save payment.transactionId
  // on the invoice). Do not put MongoDB logic inside paymentSoapClient.js.
  return payment;
}

module.exports = { completeReservationPayment, ValidationError };
