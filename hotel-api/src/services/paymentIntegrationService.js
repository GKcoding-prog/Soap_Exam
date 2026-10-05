const { processPaymentAndGenerateReceipt } = require('./paymentSoapClient');

/**
 * Adapter layer: SOAP transport belongs here; reservation/invoice business
 * rules remain in the existing application services and models.
 */
async function completeReservationPayment({ reservationId, amount, currency, cardToken }) {
  if (!reservationId || !amount || !currency || !cardToken) {
    const error = new Error('reservationId, amount, currency and cardToken are required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const payment = await processPaymentAndGenerateReceipt({
      reservationId,
      amount,
      currency,
      cardToken
    });

    // TODO: call the existing Reservation and Invoice services here.
    // Do not put MongoDB update logic inside paymentSoapClient.js.
    return payment;
  } catch (error) {
    const wrapped = new Error(`Payment gateway request failed: ${error.message}`);
    wrapped.statusCode = 502;
    wrapped.cause = error;
    throw wrapped;
  }
}

module.exports = { completeReservationPayment };
