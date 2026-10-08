require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve frontend
app.use(express.static('public'));

// Simple request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', require('./routes/index'));

// Health check
app.get('/', (_req, res) => {
  res.json({ message: '🏨 Hotel Management API is running', version: '1.0.0' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ succes: false, message: 'Route introuvable.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ succes: false, message: 'Erreur interne du serveur.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
