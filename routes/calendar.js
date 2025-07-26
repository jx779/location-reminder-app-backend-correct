const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/Calendar'); // Import the Calendar model

// Helper function to validate event data
const validateEvent = (eventData) => {
    const { title, date, time, description, color, userId } = eventData;
    
    if (!title || title.trim().length === 0) {
        return { valid: false, message: 'Title is required' };
    }
    
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return { valid: false, message: 'Valid date is required (YYYY-MM-DD format)' };
    }
    
    if (!userId) {
        return { valid: false, message: 'User ID is required' };
    }
    
    return { valid: true };
};

// GET /api/calendar/events - Get all events for a user
router.get('/events', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        // Get events from database
        const userEvents = await CalendarEvent.find({ 
            userId: userId, 
            isActive: true 
        }).sort({ date: 1, time: 1 });
        
        // Format events for frontend
        const formattedEvents = userEvents.map(event => event.toClientFormat());
        
        res.json({
            success: true,
            data: formattedEvents,
            count: formattedEvents.length
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch events'
        });
    }
});

// GET /api/calendar/events/:date - Get events for a specific date
router.get('/events/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        // Validate date format
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }
        
        // Get events from database for specific date
        const dateEvents = await CalendarEvent.getEventsByDate(userId, date);
        
        // Format events for frontend
        const formattedEvents = dateEvents.map(event => event.toClientFormat());
        
        res.json({
            success: true,
            data: formattedEvents,
            date: date,
            count: formattedEvents.length
        });
    } catch (error) {
        console.error('Error fetching events for date:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch events for date'
        });
    }
});

// POST /api/calendar/events - Create a new event
router.post('/events', async (req, res) => {
    try {
        const eventData = req.body;
        
        // Validate event data
        const validation = validateEvent(eventData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }
        
        // Create new event in database
        const newEvent = new CalendarEvent({
            title: eventData.title.trim(),
            date: eventData.date,
            time: eventData.time || 'All Day',
            description: eventData.description || '',
            color: eventData.color || '#007AFF',
            userId: eventData.userId
        });
        
        const savedEvent = await newEvent.save();
        
        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: savedEvent.toClientFormat()
        });
    } catch (error) {
        console.error('Error creating event:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create event'
        });
    }
});

// PUT /api/calendar/events/:id - Update an existing event
router.put('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const eventData = req.body;
        
        // Validate event data
        const validation = validateEvent(eventData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }
        
        // Find and update the event
        const existingEvent = await CalendarEvent.findOne({ 
            _id: id, 
            userId: eventData.userId,
            isActive: true 
        });
        
        if (!existingEvent) {
            return res.status(404).json({
                success: false,
                message: 'Event not found or unauthorized'
            });
        }
        
        // Update event fields
        existingEvent.title = eventData.title.trim();
        existingEvent.date = eventData.date;
        existingEvent.time = eventData.time || 'All Day';
        existingEvent.description = eventData.description || '';
        existingEvent.color = eventData.color || '#007AFF';
        
        const updatedEvent = await existingEvent.save();
        
        res.json({
            success: true,
            message: 'Event updated successfully',
            data: updatedEvent.toClientFormat()
        });
    } catch (error) {
        console.error('Error updating event:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        // Handle invalid ObjectId
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid event ID'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update event'
        });
    }
});

// DELETE /api/calendar/events/:id - Delete an event
router.delete('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        // Find and soft delete the event (set isActive to false)
        const deletedEvent = await CalendarEvent.findOneAndUpdate(
            { 
                _id: id, 
                userId: userId, 
                isActive: true 
            },
            { isActive: false },
            { new: true }
        );
        
        if (!deletedEvent) {
            return res.status(404).json({
                success: false,
                message: 'Event not found or unauthorized'
            });
        }
        
        res.json({
            success: true,
            message: 'Event deleted successfully',
            data: deletedEvent.toClientFormat()
        });
    } catch (error) {
        console.error('Error deleting event:', error);
        
        // Handle invalid ObjectId
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid event ID'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to delete event'
        });
    }
});

// GET /api/calendar/events/range/:startDate/:endDate - Get events in date range
router.get('/events/range/:startDate/:endDate', async (req, res) => {
    try {
        const { startDate, endDate } = req.params;
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        // Validate date formats
        if (!startDate.match(/^\d{4}-\d{2}-\d{2}$/) || !endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }
        
        // Get events in date range from database
        const rangeEvents = await CalendarEvent.getEventsByDateRange(userId, startDate, endDate);
        
        // Format events for frontend
        const formattedEvents = rangeEvents.map(event => event.toClientFormat());
        
        res.json({
            success: true,
            data: formattedEvents,
            startDate,
            endDate,
            count: formattedEvents.length
        });
    } catch (error) {
        console.error('Error fetching events in range:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch events in range'
        });
    }
});

// POST /api/calendar/events/bulk - Create multiple events
router.post('/events/bulk', async (req, res) => {
    try {
        const { events: eventList, userId } = req.body;
        
        if (!Array.isArray(eventList)) {
            return res.status(400).json({
                success: false,
                message: 'Events must be an array'
            });
        }
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        const createdEvents = [];
        const errors = [];
        
        // Process each event
        for (let i = 0; i < eventList.length; i++) {
            const eventData = eventList[i];
            eventData.userId = userId;
            
            // Validate each event
            const validation = validateEvent(eventData);
            if (!validation.valid) {
                errors.push({
                    index: i,
                    message: validation.message,
                    event: eventData
                });
                continue;
            }
            
            try {
                // Create event in database
                const newEvent = new CalendarEvent({
                    title: eventData.title.trim(),
                    date: eventData.date,
                    time: eventData.time || 'All Day',
                    description: eventData.description || '',
                    color: eventData.color || '#007AFF',
                    userId: eventData.userId
                });
                
                const savedEvent = await newEvent.save();
                createdEvents.push(savedEvent.toClientFormat());
            } catch (error) {
                errors.push({
                    index: i,
                    message: error.message,
                    event: eventData
                });
            }
        }
        
        res.status(201).json({
            success: true,
            message: `${createdEvents.length} events created successfully`,
            data: createdEvents,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Error creating bulk events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create events'
        });
    }
});

module.exports = router;