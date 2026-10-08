require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

function parseArgs() {
  const args = {};
  const parts = process.argv.slice(2);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith('--')) {
      const key = p.slice(2);
      const val = parts[i + 1] && !parts[i + 1].startsWith('--') ? parts[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const {
    email,
    password,
    role = 'client',
    nom = 'User',
    prenom = 'Test',
    telephone = '',
    adresse = '',
    uri,
  } = args;

  if (!email || !password) {
    console.error('Usage: node create_user.js --email user@example.com --password secret [--role admin|client] [--nom Last] [--prenom First]');
    process.exit(1);
  }

  const mongoUri = uri || process.env.MONGO_URI || 'mongodb://localhost:27017/hotel';

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to', mongoUri);

    const existing = await User.findOne({ email });
    if (existing) {
      console.error('User already exists with that email:', email);
      process.exit(1);
    }

    const user = await User.create({
      nom,
      prenom,
      email,
      motDePasse: password,
      role,
      telephone,
      adresse,
    });

    console.log('✅ User created:', { id: user._id.toString(), email: user.email, role: user.role });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
