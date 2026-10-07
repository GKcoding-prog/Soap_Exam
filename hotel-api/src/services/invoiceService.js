const crypto = require('crypto');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const reservationService = require('./reservationService');
const { NotFoundError, ConflictError } = require('../errors');

/** Issues the invoice of a reservation (one invoice per reservation). */
async function createInvoiceForReservation(reservationId) {
  const reservation = await reservationService.getReservation(reservationId);
  if (reservation.status === 'CANCELLED') {
    throw new ConflictError(`Reservation ${reservationId} is cancelled`);
  }
  if (await Invoice.exists({ reservation: reservation._id })) {
    throw new ConflictError(`Reservation ${reservationId} already has an invoice`);
  }
  return Invoice.create({
    invoiceNumber: `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    reservation: reservation._id,
    amount: reservation.totalAmount,
    currency: reservation.currency
  });
}

async function getInvoice(id) {
  const invoice = mongoose.isValidObjectId(id) ? await Invoice.findById(id) : null;
  if (!invoice) {
    throw new NotFoundError(`Invoice ${id} not found`);
  }
  return invoice;
}

/** Throws if the invoice cannot be paid (already paid). */
function assertPayable(invoice) {
  if (invoice.status === 'PAID') {
    throw new ConflictError(`Invoice ${invoice.invoiceNumber} is already paid (transaction ${invoice.transactionId})`);
  }
}

/**
 * Stores the result of a payment attempt. On SUCCESS the invoice becomes PAID
 * and keeps the gateway's transactionId; a DECLINED attempt is only logged.
 *
 * @param payment JSON object mapped from the SOAP response by paymentSoapClient
 */
async function recordPayment(invoice, payment) {
  invoice.paymentAttempts.push({
    transactionId: payment.transactionId,
    status: payment.status,
    authorizationCode: payment.authorizationCode,
    issueDate: payment.issueDate
  });

  if (payment.status === 'SUCCESS') {
    invoice.status = 'PAID';
    invoice.transactionId = payment.transactionId;
    invoice.authorizationCode = payment.authorizationCode;
    invoice.paidAt = payment.issueDate;
    invoice.receiptXmlData = payment.receiptXmlData;
  }
  return invoice.save();
}

module.exports = { createInvoiceForReservation, getInvoice, assertPayable, recordPayment };
