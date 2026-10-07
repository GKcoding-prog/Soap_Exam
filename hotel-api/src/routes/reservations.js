const express = require('express');
const reservationService = require('../services/reservationService');
const invoiceService = require('../services/invoiceService');

const router = express.Router();

router.post('/', async (req, res) => {
  res.status(201).json(await reservationService.createReservation(req.body));
});

router.get('/', async (req, res) => {
  res.json(await reservationService.listReservations());
});

router.get('/:id', async (req, res) => {
  res.json(await reservationService.getReservation(req.params.id));
});

/** Issues the invoice for this reservation (amount = reservation total). */
router.post('/:id/invoice', async (req, res) => {
  res.status(201).json(await invoiceService.createInvoiceForReservation(req.params.id));
});

module.exports = router;
