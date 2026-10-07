const mongoose = require('mongoose');

/** One call to the payment gateway, kept for audit (SUCCESS or DECLINED). */
const paymentAttemptSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'DECLINED'], required: true },
    authorizationCode: String,
    issueDate: Date
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, unique: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, uppercase: true, match: /^[A-Z]{3}$/ },
    status: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },

    // Filled from the SOAP response when the payment succeeds.
    transactionId: { type: String, unique: true, sparse: true },
    authorizationCode: String,
    paidAt: Date,
    receiptXmlData: String,

    paymentAttempts: { type: [paymentAttemptSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
