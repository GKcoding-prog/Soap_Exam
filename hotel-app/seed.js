require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Chambre = require('./models/Chambre');
const Service = require('./models/Service');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('🌱 Seeding database...');

  await User.deleteMany({});
  await Chambre.deleteMany({});
  await Service.deleteMany({});

  // Create admin
  await User.create({
    nom: 'Admin',
    prenom: 'Hotel',
    email: 'admin@hotel.com',
    motDePasse: 'admin123',
    role: 'admin',
  });

  // Create sample client
  await User.create({
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean@example.com',
    motDePasse: 'client123',
    telephone: '+257 79 000 001',
    adresse: 'Bujumbura, Burundi',
    role: 'client',
  });

  // Create rooms
  await Chambre.insertMany([
    { numero: '101', type: 'simple', prixParNuit: 50000, capacite: 1, etage: 1, equipements: ['wifi', 'TV', 'climatisation'], description: 'Chambre simple confortable' },
    { numero: '102', type: 'simple', prixParNuit: 50000, capacite: 1, etage: 1, equipements: ['wifi', 'TV'], description: 'Chambre simple vue jardin' },
    { numero: '201', type: 'double', prixParNuit: 85000, capacite: 2, etage: 2, equipements: ['wifi', 'TV', 'climatisation', 'minibar'], description: 'Chambre double vue piscine' },
    { numero: '202', type: 'double', prixParNuit: 85000, capacite: 2, etage: 2, equipements: ['wifi', 'TV', 'climatisation'], description: 'Chambre double standard' },
    { numero: '301', type: 'suite', prixParNuit: 180000, capacite: 2, etage: 3, equipements: ['wifi', 'TV', 'climatisation', 'jacuzzi', 'minibar', 'salon'], description: 'Suite luxueuse avec terrasse' },
    { numero: '401', type: 'familiale', prixParNuit: 130000, capacite: 4, etage: 4, equipements: ['wifi', 'TV', 'climatisation', 'cuisine'], description: 'Suite familiale 2 chambres' },
  ]);

  // Create services
  await Service.insertMany([
    { nom: 'Petit-déjeuner', prix: 8000, categorie: 'restauration', description: 'Buffet petit-déjeuner complet' },
    { nom: 'Déjeuner', prix: 15000, categorie: 'restauration', description: 'Menu déjeuner 3 plats' },
    { nom: 'Dîner', prix: 18000, categorie: 'restauration', description: 'Dîner gastronomique' },
    { nom: 'Room Service', prix: 5000, categorie: 'restauration', description: 'Service en chambre 24h/24' },
    { nom: 'Massage relaxant', prix: 25000, categorie: 'spa', description: 'Massage 1h au spa' },
    { nom: 'Transfert aéroport', prix: 20000, categorie: 'transport', description: 'Navette aéroport aller/retour' },
    { nom: 'Blanchisserie', prix: 6000, categorie: 'blanchisserie', description: 'Lavage et repassage par kg' },
  ]);

  console.log('✅ Seed terminé !');
  console.log('👤 Admin : admin@hotel.com / admin123');
  console.log('👤 Client : jean@example.com / client123');
  await mongoose.disconnect();
};

seed().catch((err) => { console.error(err); process.exit(1); });
