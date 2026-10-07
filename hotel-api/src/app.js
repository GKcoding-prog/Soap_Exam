const express = require('express');
const { connectDatabase } = require('./config/db');
const { AppError } = require('./errors');
const { PaymentGatewayError } = require('./services/paymentSoapClient');
const reservationRoutes = require('./routes/reservations');
const invoiceRoutes = require('./routes/invoices');

const app = express();
app.use(express.json());

app.use('/api/reservations', reservationRoutes);
app.use('/api/invoices', invoiceRoutes);

// Express 5 forwards errors thrown in async handlers to this middleware.
app.use((error, req, res, next) => {
  const { status, body } = toHttpError(error);
  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, error.message);
  }
  res.status(status).json(body);
});

/** Maps application and gateway errors to HTTP responses. */
function toHttpError(error) {
  if (error instanceof AppError) {
    return { status: error.statusCode, body: { type: error.type, message: error.message } };
  }
  if (error instanceof PaymentGatewayError) {
    switch (error.kind) {
      case 'FAULT':
        // soap:Client = the request was rejected (business rule or XSD validation);
        // soap:Server = the gateway failed internally.
        return error.faultCode === 'Client'
          ? { status: 422, body: { type: 'PAYMENT_REJECTED', code: error.errorCode, message: error.message, details: error.details } }
          : { status: 502, body: { type: 'PAYMENT_GATEWAY_ERROR', message: error.message } };
      case 'TIMEOUT':
        return { status: 504, body: { type: 'PAYMENT_GATEWAY_TIMEOUT', message: error.message } };
      default:
        return { status: 503, body: { type: 'PAYMENT_GATEWAY_UNAVAILABLE', message: error.message } };
    }
  }
  if (error.type === 'entity.parse.failed') {
    return { status: 400, body: { type: 'VALIDATION_ERROR', message: 'Malformed JSON body' } };
  }
  return { status: 500, body: { type: 'INTERNAL_ERROR', message: 'Unexpected error' } };
}

const port = Number(process.env.PORT || 3000);

connectDatabase()
  .then(() => {
    app.listen(port, () => console.log(`Hotel API listening on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('Cannot connect to MongoDB:', error.message);
    process.exit(1);
  });
