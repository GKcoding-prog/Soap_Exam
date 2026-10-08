const mongoose = require('mongoose');

const ligneFactureSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantite: { type: Number, default: 1 },
  prixUnitaire: { type: Number, required: true },
  total: { type: Number, required: true },
});

// One call to the SOAP payment gateway, kept for audit (SUCCESS or DECLINED)
const tentativePaiementSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  statut: { type: String, enum: ['SUCCESS', 'DECLINED'], required: true },
  codeAutorisation: { type: String },
  date: { type: Date },
}, { _id: false });

const factureSchema = new mongoose.Schema({
  reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  numero: { type: String, unique: true }, // e.g. FACT-2024-0001
  lignes: [ligneFactureSchema],
  sousTotal: { type: Number, required: true },
  tva: { type: Number, default: 0.18 }, // 18% TVA
  montantTVA: { type: Number },
  montantTotal: { type: Number, required: true },
  statut: {
    type: String,
    enum: ['en_attente', 'payee', 'annulee'],
    default: 'en_attente',
  },
  methodePaiement: {
    type: String,
    enum: ['especes', 'carte', 'virement', 'non_defini'],
    default: 'non_defini',
  },
  datePaiement: { type: Date },
  devise: { type: String, uppercase: true, match: /^[A-Z]{3}$/, default: () => process.env.PAYMENT_CURRENCY || 'BIF' },

  // Filled from the SOAP gateway response when a card payment succeeds
  transactionId: { type: String, unique: true, sparse: true },
  codeAutorisation: { type: String },
  recuXml: { type: String },
  tentativesPaiement: { type: [tentativePaiementSchema], default: [] },
}, { timestamps: true });

// Auto-generate invoice number and compute totals
// (pre-validate, so the required montantTotal is set before validation runs)
factureSchema.pre('validate', async function (next) {
  if (!this.numero) {
    const count = await mongoose.model('Facture').countDocuments();
    const year = new Date().getFullYear();
    this.numero = `FACT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  this.montantTVA = this.sousTotal * this.tva;
  this.montantTotal = this.sousTotal + this.montantTVA;
  next();
});

module.exports = mongoose.model('Facture', factureSchema);
