const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
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
  isOutdoor: {
    type: Boolean,
    default: false
  },
  location: {
    name: {
      type: String,
      trim: true
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    proximity: {
      type: Number,
      min: 10,
      max: 5000,
      default: 100
    }
  },
  // New fields for AI-generated reminders
  aiGenerated: { 
    type: Boolean, 
    default: false 
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  relatedEvent: {
    type: String,
    trim: true,
    maxlength: 200
  },
  suggestedDate: {
    type: Date
  }
}, { 
  timestamps: true 
});

// Index for better query performance
reminderSchema.index({ aiGenerated: 1, createdAt: -1 });
reminderSchema.index({ category: 1 });
reminderSchema.index({ isActive: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);