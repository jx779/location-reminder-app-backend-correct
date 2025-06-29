const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');

// GET all reminders
router.get('/', async (req, res) => {
  try {
    const reminders = await Reminder.find();
    res.status(200).json(reminders);
  } catch (err) {
    console.error('Failed to get reminders:', err);
    res.status(500).json({ message: 'Failed to retrieve reminders' });
  }
});

// POST a new reminder
router.post('/', async (req, res) => {
  const { title, category, isActive, location } = req.body;

  if (!title || !category) {
    return res.status(400).json({ message: 'Title and category are required' });
  }

  try {
    const newReminder = new Reminder({
      title,
      category,
      isActive: isActive ?? true,
      location,
    });

    const saved = await newReminder.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error saving reminder:', err);
    res.status(500).json({ message: 'Failed to save reminder' });
  }
});

// PATCH to update a reminder (including location)
router.patch('/:id', async (req, res) => {
  const reminderId = req.params.id;
  const updates = req.body;

  try {
    const updatedReminder = await Reminder.findByIdAndUpdate(
      reminderId,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedReminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    res.status(200).json(updatedReminder);
  } catch (err) {
    console.error('Error updating reminder:', err);
    res.status(500).json({ message: 'Failed to update reminder' });
  }
});

// PUT to update location of a reminder (keeping for compatibility)
router.put('/:id/location', async (req, res) => {
  const { location } = req.body;
  const reminderId = req.params.id;

  if (!location || !location.latitude || !location.longitude) {
    return res.status(400).json({ message: 'Location with latitude and longitude required' });
  }

  try {
    const updatedReminder = await Reminder.findByIdAndUpdate(
      reminderId,
      { location },
      { new: true }
    );

    if (!updatedReminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    res.status(200).json(updatedReminder);
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ message: 'Failed to update location' });
  }
});

// DELETE a reminder
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Reminder.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    res.status(200).json({ message: 'Reminder deleted successfully' });
  } catch (err) {
    console.error('Error deleting reminder:', err);
    res.status(500).json({ message: 'Failed to delete reminder' });
  }
});

module.exports = router;