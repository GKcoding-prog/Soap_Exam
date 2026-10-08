const mongoose = require('mongoose');

const consommationServiceSchema = new mongoose.Schema({
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  quantite: { type: Number, default: 1, min: 1 },
  prixUnitaire: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String },
});

const evaluationSchema = new mongoose.Schema({
  note: { type: Number, min: 1, max: 5 },
  commentaire: { type: String },
  date: { type: Date, default: Date.now },
});

const reservationSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chambre: { type: mongoose.Schema.Types.ObjectId, ref: 'Chambre', required: true },
  dateArrivee: { type: Date, required: true },
  dateDepart: { type: Date, required: true },
  nombrePersonnes: { type: Number, required: true, min: 1 },
  statut: {
    type: String,
    enum: ['en_attente', 'confirmee', 'en_cours', 'terminee', 'cloturee', 'annulee'],
    default: 'en_attente',
  },
  servicesConsommes: [consommationServiceSchema],
  evaluation: evaluationSchema,
  notes: { type: String },

  // Computed fields (set when reservation is confirmed/checked out)
  prixChambre: { type: Number },
  prixServices: { type: Number, default: 0 },
  prixTotal: { type: Number },
}, { timestamps: true });

// Calculate number of nights
reservationSchema.virtual('nombreNuits').get(function () {
  const diff = this.dateDepart - this.dateArrivee;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Auto-compute totals before save
reservationSchema.pre('save', async function (next) {
  if (this.prixChambre) {
    const nuits = Math.ceil((this.dateDepart - this.dateArrivee) / (1000 * 60 * 60 * 24));
    this.prixServices = this.servicesConsommes.reduce(
      (sum, s) => sum + s.prixUnitaire * s.quantite, 0
    );
    this.prixTotal = this.prixChambre * nuits + this.prixServices;
  }
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);
