const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  category: { 
    type: String, 
    required: true,
    trim: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  location: {
    latitude: Number,
    longitude: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);