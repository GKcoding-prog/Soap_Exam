const mongoose = require('mongoose');

const chambreSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['simple', 'double', 'suite', 'familiale'],
    required: true,
  },
  prixParNuit: { type: Number, required: true, min: 0 },
  capacite: { type: Number, required: true, min: 1 },
  description: { type: String },
  equipements: [{ type: String }], // ['wifi', 'TV', 'climatisation', ...]
  etage: { type: Number, default: 1 },
  disponible: { type: Boolean, default: true },
  images: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Chambre', chambreSchema);
