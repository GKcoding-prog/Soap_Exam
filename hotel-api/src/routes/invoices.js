const express = require('express');
const invoiceService = require('../services/invoiceService');
const { payInvoice } = require('../services/paymentIntegrationService');

const router = express.Router();

router.get('/:id', async (req, res) => {
  res.json(await invoiceService.getInvoice(req.params.id));
});

/**
 * Validates the invoice: sends it to the SOAP payment gateway.
 * Body: { "cardToken": "..." }  (the token "DECLINED" simulates a refused card)
 */
router.post('/:id/pay', async (req, res) => {
  const result = await payInvoice(req.params.id, req.body);
  // 402 Payment Required: the bank declined the card.
  res.status(result.payment.status === 'SUCCESS' ? 200 : 402).json(result);
});

module.exports = router;
