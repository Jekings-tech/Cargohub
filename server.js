require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fetch = require('node-fetch');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const User = require('./models/User');

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Database Connection — reads from .env (local) or Render env (prod) =====
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MONGODB_URI is not set. Add it in .env or Render → Environment.');
  process.exit(1);
}

mongoose
  .connect(mongoURI)
  .then(() => console.log('✅ MongoDB Atlas connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// ===== API Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shipments', shipmentRoutes);

// ===== Health =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Cargo Hub API' });
});

// ===== Root =====
app.get('/', (req, res) => {
  res.json({ service: 'Cargo Hub API', status: 'running' });
});

// ===== 404 for unknown /api routes =====
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// ===== Seed default admin =====
async function seedAdmin() {
  try {
    const existing = await User.findOne({ username: 'Cargo' });
    if (existing) {
      console.log('✅ Admin user already exists');
      return;
    }
    await User.create({
      username: 'Cargo',
      password: 'Cargo123',
      role: 'admin',
      fullName: 'Administrator',
    });
    console.log('✅ Default admin created → username: Cargo | password: Cargo123');
  } catch (err) {
    console.error('❌ Seed admin error:', err.message);
  }
}

// ===== Keep-alive =====
const keepAlive = () => {
  console.log('🔄 Keep-alive monitor started — pinging every 10 minutes');
  setInterval(async () => {
    try {
      const response = await fetch('https://cargohub-sn8r.onrender.com/api/health');
      console.log(`✅ Keep-alive ping: ${response.status}`);
    } catch (error) {
      console.log(`⚠️ Keep-alive ping failed: ${error.message}`);
    }
  }, 10 * 60 * 1000);
};

// ===== Boot =====
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(`🚀 Cargo Hub API running on port ${PORT}`);
      keepAlive();
    });
  } catch (err) {
    console.error('❌ Startup error:', err.message);
    process.exit(1);
  }
}

start();