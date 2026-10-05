const express = require('express');
const { completeReservationPayment, ValidationError } = require('./services/paymentIntegrationService');
const { PaymentGatewayError } = require('./services/paymentSoapClient');

const app = express();
app.use(express.json());

app.post('/api/payments', async (req, res) => {
  try {
    const payment = await completeReservationPayment(req.body);
    // 402 Payment Required: the bank declined the card.
    res.status(payment.status === 'SUCCESS' ? 200 : 402).json(payment);
  } catch (error) {
    const { status, body } = toHttpError(error);
    if (status >= 500) {
      console.error('[payments]', error.message);
    }
    res.status(status).json(body);
  }
});

/** Maps application and gateway errors to HTTP responses. */
function toHttpError(error) {
  if (error instanceof ValidationError) {
    return { status: 400, body: { type: 'VALIDATION_ERROR', message: error.message } };
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
  return { status: 500, body: { type: 'INTERNAL_ERROR', message: 'Unexpected error' } };
}

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Hotel API listening on http://localhost:${port}`);
});
