const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  description: { type: String },
  prix: { type: Number, required: true, min: 0 },
  categorie: {
    type: String,
    enum: ['restauration', 'spa', 'transport', 'blanchisserie', 'autre'],
    default: 'autre',
  },
  disponible: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
