const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const weatherRoutes = require('./routes/weather');
const PORT = process.env.PORT || 5002; // Changed to 5002 to match your frontend

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:8081', 
    'exp://192.168.219.161:8081',
    'http://192.168.219.161:8081'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Enhanced middleware
app.use(express.json({ limit: '10mb' })); // Increased limit for AI reminders
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0 && req.path !== '/api/weather/reminders-batch') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// MongoDB Connection
const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reminders_app';
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected successfully');
    console.log(`📍 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
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

// Debug: Test if calendar routes file can be loaded
console.log('🔍 Attempting to load calendar routes...');
try {
  const calendarRoutes = require('./routes/calendar');
  console.log('✅ Calendar routes loaded successfully');
  console.log('📅 Calendar routes type:', typeof calendarRoutes);
} catch (error) {
  console.error('❌ Error loading calendar routes:', error.message);
  console.error('📁 Make sure ./routes/calendar.js exists');
}

// Routes
app.use('/api/reminders', require('./routes/reminder'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/weather', weatherRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime(),
    features: ['AI Reminders', 'Weather Integration', 'Location Tracking']
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Reminders API Server v2.0 with AI Support',
    features: ['AI Reminders', 'Weather Integration', 'Location Tracking'],
    endpoints: {
      reminders: '/api/reminders',
      aiSync: '/api/reminders/sync-ai',
      aiStats: '/api/reminders/stats/ai',
      calendar: '/api/calendar',
      weather: '/api/weather',
      health: '/api/health'
    }
  });
});

// Test route to verify Express is working
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API test route working', 
    timestamp: new Date(),
    server: 'Enhanced with AI support'
  });
});

// Calendar API health check
app.get('/api/calendar/health', (req, res) => {
  res.json({ 
    message: 'Calendar API is working!', 
    timestamp: new Date(),
    endpoints: [
      'GET /api/calendar/events?userId=:userId',
      'POST /api/calendar/events',
      'PUT /api/calendar/events/:id',
      'DELETE /api/calendar/events/:id?userId=:userId',
      'GET /api/calendar/events/:date?userId=:userId',
      'GET /api/calendar/events/range/:startDate/:endDate?userId=:userId',
      'POST /api/calendar/events/bulk'
    ]
  });
});

// Reminders API health check
app.get('/api/reminders/health', (req, res) => {
  res.json({ 
    message: 'Reminders API is working with AI support!', 
    timestamp: new Date(),
    endpoints: [
      'GET /api/reminders',
      'POST /api/reminders',
      'GET /api/reminders/:id',
      'PATCH /api/reminders/:id',
      'DELETE /api/reminders/:id',
      'POST /api/reminders/sync-ai',
      'GET /api/reminders/stats/ai'
    ]
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Handle 404
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/api/reminders',
      '/api/calendar', 
      '/api/weather',
      '/api/health'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API Base URL: http://192.168.219.161:${PORT}/api`);
  console.log(`📋 Reminder API: http://192.168.219.161:${PORT}/api/reminders`);
  console.log(`🤖 AI Sync API: http://192.168.219.161:${PORT}/api/reminders/sync-ai`);
  console.log(`📅 Calendar API: http://192.168.219.161:${PORT}/api/calendar`);
  console.log(`🌤️ Weather API: http://192.168.219.161:${PORT}/api/weather`);
  console.log(`🔍 Health Check: http://192.168.219.161:${PORT}/api/health`);
  console.log(`💡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;