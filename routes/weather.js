const axios = require('axios');

const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');

// Get weather for specific area
router.get('/:area', async (req, res) => {
    try {
        const { area } = req.params;
        
        if (!area || area.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Area parameter is required'
            });
        }
        
        const result = await weatherService.getWeatherForArea(area);
        
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(404).json({
                message: result.message,
                availableAreas: result.availableAreas
            });
        }
        
    } catch (error) {
        console.error('❌ Weather route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Check weather for event/reminder
router.post('/check-event', async (req, res) => {
    try {
        const event = req.body;
        
        if (!event) {
            return res.status(400).json({
                success: false,
                message: 'Event data is required'
            });
        }
        
        const result = await weatherService.checkEventWeather(event);
        res.json(result);
        
    } catch (error) {
        console.error('❌ Event weather check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check event weather',
            error: error.message
        });
    }
});

// Get all available areas
router.get('/areas/list', async (req, res) => {
    try {
        const areas = weatherService.getAllAreas();
        res.json({
            success: true,
            areas: areas,
            count: areas.length
        });
    } catch (error) {
        console.error('❌ Areas list error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get areas list',
            error: error.message
        });
    }
});

// Process multiple reminders with weather
router.post('/reminders-batch', async (req, res) => {
    try {
        const { reminders } = req.body;
        
        if (!Array.isArray(reminders)) {
            return res.status(400).json({
                success: false,
                message: 'Reminders array is required'
            });
        }
        
        const processedReminders = await Promise.all(
            reminders.map(async (reminder) => {
                if (reminder.isOutdoor && reminder.location) {
                    console.log(`🔄 Fetching weather for reminder: ${reminder.title} at ${JSON.stringify(reminder.location)}`);
                    const weatherCheck = await weatherService.checkEventWeather(reminder);
                    console.log(`✅ Weather fetched for reminder: ${reminder.title}`, weatherCheck);
                    return {
                        ...reminder,
                        weather: weatherCheck.weather || null,
                        weatherAlert: weatherCheck.alert || null
                    };
                }
                return reminder;
            })
        );
        
        res.json({
            success: true,
            reminders: processedReminders
        });
        
    } catch (error) {
        console.error('❌ Batch reminders weather error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process reminders with weather',
            error: error.message
        });
    }
});

module.exports = router;

