const User = require('../models/User');
const jwt = require('jsonwebtoken');

const genererToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// @POST /api/auth/inscription
exports.inscription = async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, telephone, adresse } = req.body;

    const existant = await User.findOne({ email });
    if (existant) {
      return res.status(400).json({ succes: false, message: 'Email déjà utilisé.' });
    }

    const user = await User.create({ nom, prenom, email, motDePasse, telephone, adresse });
    const token = genererToken(user._id);

    res.status(201).json({ succes: true, token, data: user });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @POST /api/auth/connexion
exports.connexion = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({ succes: false, message: 'Email et mot de passe requis.' });
    }

    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user || !(await user.verifierMotDePasse(motDePasse))) {
      return res.status(401).json({ succes: false, message: 'Identifiants incorrects.' });
    }

    if (!user.actif) {
      return res.status(403).json({ succes: false, message: 'Compte désactivé.' });
    }

    const token = genererToken(user._id);
    // Remove password from response
    user.motDePasse = undefined;

    res.json({ succes: true, token, data: user });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @GET /api/auth/moi
exports.moi = async (req, res) => {
  res.json({ succes: true, data: req.user });
};

// @PUT /api/auth/moi
exports.modifierProfil = async (req, res) => {
  try {
    const { nom, prenom, telephone, adresse } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { nom, prenom, telephone, adresse },
      { new: true, runValidators: true }
    );
    res.json({ succes: true, data: user });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};
