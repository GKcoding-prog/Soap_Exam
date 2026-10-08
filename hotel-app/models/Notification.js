const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  destinataire: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['reservation_confirmee', 'reservation_annulee', 'checkin', 'checkout', 'facture_generee', 'service_ajoute', 'evaluation', 'paiement_recu'],
    required: true,
  },
  titre: { type: String, required: true },
  message: { type: String, required: true },
  lu: { type: Boolean, default: false },
  lien: { type: String }, // e.g. /reservations/:id
  meta: { type: mongoose.Schema.Types.Mixed }, // extra data
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
