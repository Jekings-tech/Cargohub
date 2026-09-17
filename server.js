require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const User = require('./models/User');

const app = express();

// ===== Middleware =====
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    credentials: true,
  })
);
// Increase payload size because we accept base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Serve static client (optional, for local dev) =====
app.use(express.static(path.join(__dirname, '..', 'client')));

// ===== API Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shipments', shipmentRoutes);

// ===== Health =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Cargo Hub API' });
});

// ===== 404 =====
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
    console.log('✅ Default admin created  →  username: Cargo | password: Cargo123');
  } catch (err) {
    console.error('❌ Seed admin error:', err.message);
  }
}

// ===== Boot =====
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    await seedAdmin();

    app.listen(PORT, () => {
      console.log(`🚀 Cargo Hub API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Startup error:', err.message);
    process.exit(1);
  }
}

start();