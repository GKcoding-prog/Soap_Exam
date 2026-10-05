const express = require('express');
const { completeReservationPayment } = require('./services/paymentIntegrationService');

const app = express();
app.use(express.json());

app.post('/api/payments', async (req, res) => {
  try {
    const payment = await completeReservationPayment(req.body);
    res.status(payment.status === 'SUCCESS' ? 200 : 402).json(payment);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message,
      type: error.statusCode === 502 ? 'PAYMENT_GATEWAY_ERROR' : 'VALIDATION_ERROR'
    });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Hotel API listening on http://localhost:${port}`);
});
