const { processPaymentAndGenerateReceipt } = require('./paymentSoapClient');
const invoiceService = require('./invoiceService');
const reservationService = require('./reservationService');
const { ValidationError } = require('../errors');

/**
 * Adapter between the SOAP gateway and the hotel application.
 *
 * It holds no business rules: it asks invoiceService whether the invoice can
 * be paid, sends the invoice to the gateway, then hands the mapped result back
 * to invoiceService and reservationService, which update MongoDB.
 */
async function payInvoice(invoiceId, { cardToken } = {}) {
  if (!cardToken) {
    throw new ValidationError('cardToken is required');
  }

  const invoice = await invoiceService.getInvoice(invoiceId);
  invoiceService.assertPayable(invoice);

  // PaymentGatewayError (FAULT / UNAVAILABLE / TIMEOUT) propagates to the route,
  // leaving the invoice and reservation unchanged.
  const payment = await processPaymentAndGenerateReceipt({
    reservationId: invoice.reservation.toString(),
    amount: invoice.amount.toFixed(2),
    currency: invoice.currency,
    cardToken: String(cardToken)
  });

  const updatedInvoice = await invoiceService.recordPayment(invoice, payment);
  const reservation = payment.status === 'SUCCESS'
    ? await reservationService.checkOut(invoice.reservation)
    : await reservationService.getReservation(invoice.reservation);

  return { payment, invoice: updatedInvoice, reservation };
}

module.exports = { payInvoice };
