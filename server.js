const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const weatherRoutes = require('./routes/weather');
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI); // Removed deprecated options
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Debug: Test if reminder routes file can be loaded
console.log('🔍 Attempting to load reminder routes...');
try {
  const reminderRoutes = require('./routes/reminder');
  console.log('✅ Reminder routes loaded successfully');
  console.log('📋 Reminder routes type:', typeof reminderRoutes);
} catch (error) {
  console.error('❌ Error loading reminder routes:', error.message);
  console.error('📁 Make sure ./routes/reminder.js exists');
}

// Add request logging
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/reminders', require('./routes/reminder'));

app.use('/api/weather', weatherRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Backend API is running!' });
});

// Test route to verify Express is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'API test route working', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Handle 404
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;