const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');

// GET all reminders
router.get('/', async (req, res) => {
  try {
    const { includeAI, category, isActive } = req.query;
    
    // Build query filter
    let filter = {};
    
    if (includeAI === 'false') {
      filter.aiGenerated = false;
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const reminders = await Reminder.find(filter).sort({ createdAt: -1 });

    // Enrich each reminder with weather
    const weatherService = require('../services/weatherService');

    const enrichedReminders = await Promise.all(reminders.map(async (reminder) => {
      let weather = null;
      
      // Use reminder title (or .location.area if you add that later)
      const area = reminder.title?.trim();

      if (reminder.isOutdoor && area) {
        try {
          const result = await weatherService.getWeatherForArea(area);
          if (result.success) {
            weather = result.data;
          }
        } catch (err) {
          console.warn(`⚠️ Weather lookup failed for "${area}":`, err.message);
        }
      }

      return {
        ...reminder.toObject(),
        weather
      };
    }));

    console.log(`📊 Found ${enrichedReminders.length} reminders (AI filtered: ${includeAI})`);
    res.json(enrichedReminders);
  } catch (error) {
    console.error('❌ Error fetching reminders:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// GET single reminder
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid reminder ID format' });
    }

    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    res.json(reminder);
  } catch (error) {
    console.error('❌ Error fetching reminder:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// POST new reminder
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      category, 
      isActive, 
      isOutdoor, 
      location,
      aiGenerated = false,
      reason,
      priority = 'medium',
      relatedEvent,
      suggestedDate
    } = req.body;

    // Debug logs to see what we're receiving
    console.log('🔄 Backend received reminder data:', JSON.stringify(req.body, null, 2));
    console.log('🔄 Backend received isOutdoor:', isOutdoor, typeof isOutdoor);
    console.log('🔄 Backend received aiGenerated:', aiGenerated, typeof aiGenerated);

    if (!title || !category) {
      return res.status(400).json({ message: 'Title and category are required' });
    }

    // Validate priority
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({ message: 'Priority must be low, medium, or high' });
    }

    const reminder = new Reminder({
      title: title.trim(),
      category: category.trim(),
      isActive: isActive !== undefined ? isActive : true,
      isOutdoor: isOutdoor !== undefined ? isOutdoor : false,
      location,
      aiGenerated,
      reason: reason?.trim(),
      priority,
      relatedEvent: relatedEvent?.trim(),
      suggestedDate: suggestedDate ? new Date(suggestedDate) : undefined
    });

    console.log('🔄 Backend saving reminder:', JSON.stringify(reminder.toObject(), null, 2));

    const savedReminder = await reminder.save();
    
    console.log('✅ Backend saved reminder:', JSON.stringify(savedReminder.toObject(), null, 2));
    console.log('✅ Saved reminder isOutdoor:', savedReminder.isOutdoor, typeof savedReminder.isOutdoor);
    console.log('✅ Saved reminder aiGenerated:', savedReminder.aiGenerated, typeof savedReminder.aiGenerated);
    
    res.status(201).json(savedReminder);
  } catch (error) {
    console.error('❌ Error creating reminder:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// PATCH update reminder
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid reminder ID format' });
    }

    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    
    // Validate priority if being updated
    if (updates.priority && !['low', 'medium', 'high'].includes(updates.priority)) {
      return res.status(400).json({ message: 'Priority must be low, medium, or high' });
    }

    const reminder = await Reminder.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    console.log(`✅ Updated reminder: ${reminder.title} (AI: ${reminder.aiGenerated})`);
    res.json(reminder);
  } catch (error) {
    console.error('❌ Error updating reminder:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// PUT update location (keeping for backward compatibility)
router.put('/:id/location', async (req, res) => {
  try {
    const { location } = req.body;

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ message: 'Valid location required' });
    }

    const reminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      { location },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    res.json(reminder);
  } catch (error) {
    console.error('❌ Error updating location:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// DELETE reminder
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid reminder ID format' });
    }

    const reminder = await Reminder.findByIdAndDelete(id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    console.log(`🗑️ Deleted reminder: ${reminder.title} (AI: ${reminder.aiGenerated})`);
    res.json({ 
      message: 'Reminder deleted successfully',
      deletedReminder: {
        id: reminder._id,
        title: reminder.title,
        aiGenerated: reminder.aiGenerated
      }
    });
  } catch (error) {
    console.error('❌ Error deleting reminder:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// POST sync AI reminders from frontend
router.post('/sync-ai', async (req, res) => {
  try {
    const { aiReminders } = req.body;
    
    if (!aiReminders || !Array.isArray(aiReminders)) {
      return res.status(400).json({ message: 'aiReminders array is required' });
    }

    console.log(`🤖 Syncing ${aiReminders.length} AI reminders...`);
    
    const results = {
      synced: 0,
      skipped: 0,
      errors: 0,
      reminders: [],
      details: []
    };

    for (const aiReminder of aiReminders) {
      try {
        // Validate required fields
        if (!aiReminder.title || !aiReminder.category) {
          results.errors++;
          results.details.push({
            title: aiReminder.title || 'Unknown',
            error: 'Missing title or category'
          });
          continue;
        }

        // Check for duplicates based on title, category, and relatedEvent
        const existingReminder = await Reminder.findOne({
          title: aiReminder.title.trim(),
          category: aiReminder.category.trim(),
          aiGenerated: true,
          ...(aiReminder.relatedEvent && { relatedEvent: aiReminder.relatedEvent.trim() })
        });

        if (existingReminder) {
          results.skipped++;
          results.details.push({
            title: aiReminder.title,
            status: 'skipped',
            reason: 'Already exists'
          });
          continue;
        }

        // Create new reminder
        const newReminder = new Reminder({
          title: aiReminder.title.trim(),
          category: aiReminder.category.trim(),
          isActive: aiReminder.isActive ?? true,
          isOutdoor: aiReminder.isOutdoor ?? false,
          location: aiReminder.location,
          aiGenerated: true,
          reason: aiReminder.reason?.trim(),
          priority: aiReminder.priority || 'medium',
          relatedEvent: aiReminder.relatedEvent?.trim(),
          suggestedDate: aiReminder.suggestedDate ? new Date(aiReminder.suggestedDate) : undefined
        });

        const savedReminder = await newReminder.save();
        results.synced++;
        results.reminders.push(savedReminder);
        results.details.push({
          title: savedReminder.title,
          status: 'synced',
          id: savedReminder._id
        });

        console.log(`✅ Synced AI reminder: ${savedReminder.title}`);
      } catch (error) {
        results.errors++;
        results.details.push({
          title: aiReminder.title || 'Unknown',
          error: error.message
        });
        console.error(`❌ Error syncing reminder "${aiReminder.title}":`, error);
      }
    }

    console.log(`🎉 Sync complete: ${results.synced} synced, ${results.skipped} skipped, ${results.errors} errors`);
    
    res.json({
      success: true,
      message: `Successfully synced ${results.synced} AI reminders`,
      ...results
    });
  } catch (error) {
    console.error('❌ Error in sync-ai endpoint:', error);
    res.status(500).json({ 
      message: 'Failed to sync AI reminders',
      error: error.message 
    });
  }
});

// GET AI reminders statistics
router.get('/stats/ai', async (req, res) => {
  try {
    const totalAI = await Reminder.countDocuments({ aiGenerated: true });
    const activeAI = await Reminder.countDocuments({ aiGenerated: true, isActive: true });
    const categoriesWithAI = await Reminder.distinct('category', { aiGenerated: true });
    
    const priorityStats = await Reminder.aggregate([
      { $match: { aiGenerated: true } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    res.json({
      total: totalAI,
      active: activeAI,
      categories: categoriesWithAI.length,
      categoryList: categoriesWithAI,
      priorityBreakdown: priorityStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('❌ Error fetching AI stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch AI reminder statistics',
      error: error.message 
    });
  }
});

module.exports = router;