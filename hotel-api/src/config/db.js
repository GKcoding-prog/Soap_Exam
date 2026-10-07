const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_management';

/** Opens the MongoDB connection; fails fast if the server cannot be reached. */
async function connectDatabase() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`Connected to MongoDB (${mongoose.connection.name})`);
}

module.exports = { connectDatabase };
