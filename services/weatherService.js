const axios = require('axios');

class WeatherService {
    constructor() {
        this.cache = new Map();
        this.lastFetch = null;
        this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
        this.API_URL = 'https://api.data.gov.sg/v1/environment/2-hour-weather-forecast';
        
        // Singapore area mapping for common locations
        this.areaMapping = {
            'marina bay': 'Marina Bay',
            'orchard road': 'Orchard',
            'orchard': 'Orchard',
            'chinatown': 'Chinatown',
            'little india': 'Little India',
            'bugis': 'Bugis',
            'raffles place': 'Raffles Place',
            'clarke quay': 'Clarke Quay',
            'sentosa': 'Sentosa',
            'jurong east': 'Jurong East',
            'jurong': 'Jurong East',
            'tampines': 'Tampines',
            'woodlands': 'Woodlands',
            'changi': 'Changi',
            'changi airport': 'Changi',
            'toa payoh': 'Toa Payoh',
            'ang mo kio': 'Ang Mo Kio',
            'bedok': 'Bedok',
            'clementi': 'Clementi',
            'bishan': 'Bishan',
            'punggol': 'Punggol',
            'sengkang': 'Sengkang',
            'hougang': 'Hougang',
            'pasir ris': 'Pasir Ris',
            'yishun': 'Yishun',
            'serangoon': 'Serangoon',
            'novena': 'Novena',
            'dhoby ghaut': 'Dhoby Ghaut',
            'city hall': 'City',
            'downtown': 'Downtown Core',
            'east coast': 'East Coast',
            'west coast': 'West Coast'
        };
        
        // Start automatic weather fetching
        this.startPeriodicFetch();
    }
    
    // Fetch weather data from Singapore API
    async fetchWeatherData() {
        try {
            console.log('🌤️ Fetching weather data from Singapore API...');
            const response = await axios.get(this.API_URL, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Reminder-App/1.0'
                }
            });

            // Log full data for debugging (remove or comment out in production)
            console.log('Full weather API response:', JSON.stringify(response.data, null, 2));

            if (
                response.data &&
                response.data.items &&
                response.data.items.length > 0 &&
                response.data.items[0].forecasts
            ) {
                const forecasts = response.data.items[0].forecasts;
                const api_info = response.data.api_info;

                console.log(`✅ Weather data fetched for ${forecasts.length} areas`);

                // Return the relevant data for your cache update
                return {
                    forecasts,
                    api_info
                };
            } else {
                throw new Error('Invalid weather data structure received');
            }
        } catch (error) {
            console.error('❌ Error fetching weather data:', error.message);
            throw new Error(`Weather API Error: ${error.message}`);
        }
    }
    
    // Cache weather data
    async updateWeatherCache() {
        try {
            const weatherData = await this.fetchWeatherData();

            // Clear old cache
            this.cache.clear();

            // Cache each area's weather
            if (weatherData.forecasts) {
                weatherData.forecasts.forEach(forecast => {
                    const areaKey = forecast.area.toLowerCase();
                    this.cache.set(areaKey, {
                        area: forecast.area,
                        forecast: forecast.forecast,
                        timestamp: weatherData.api_info?.timestamp || new Date().toISOString(),
                        cached_at: new Date().toISOString()
                    });
                });
            }

            this.lastFetch = Date.now();
            console.log(`📦 Cached weather data for ${this.cache.size} areas`);

        } catch (error) {
            console.error('❌ Error updating weather cache:', error.message);
        }
    }

    
    // Check if cache needs refresh
    isCacheStale() {
        return !this.lastFetch || (Date.now() - this.lastFetch) > this.CACHE_DURATION;
    }
    
    // Get weather for specific area
    async getWeatherForArea(searchArea) {
        try {
            let areaName = typeof searchArea === 'string' 
                ? searchArea 
                : searchArea?.name || '';

            const normalizedSearch = areaName.toLowerCase().trim();
            
            // Try exact match first
            let weather = this.cache.get(normalizedSearch);
            
            // Try mapped area name
            if (!weather && this.areaMapping[normalizedSearch]) {
                const mappedArea = this.areaMapping[normalizedSearch].toLowerCase();
                weather = this.cache.get(mappedArea);
            }
            
            // Try partial match
            if (!weather) {
                for (let [key, value] of this.cache.entries()) {
                    if (key.includes(normalizedSearch) || normalizedSearch.includes(key)) {
                        weather = value;
                        break;
                    }
                }
            }
            
            if (!weather) {
                return {
                    success: false,
                    message: `Weather data not found for area: ${searchArea}`,
                    availableAreas: Array.from(this.cache.keys())
                };
            }
            
            return {
                success: true,
                data: {
                    ...weather,
                    warning: this.hasWeatherWarning(weather.forecast),
                    recommendation: this.getWeatherRecommendation(weather.forecast),
                    icon: this.getWeatherIcon(weather.forecast)
                }
            };
            
        } catch (error) {
            console.error('❌ Error getting weather for area:', error.message);
            return {
                success: false,
                message: 'Failed to retrieve weather data',
                error: error.message
            };
        }
    }
    
    // Check if weather condition needs warning
    hasWeatherWarning(forecast) {
        const forecastLower = forecast.toLowerCase();
        const warningConditions = [
            'thundery showers', 'heavy rain', 'rain', 'showers',
            'thunderstorm', 'stormy', 'windy', 'hazy'
        ];
        
        return warningConditions.some(condition => forecastLower.includes(condition));
    }
    
    // Get weather recommendation
    getWeatherRecommendation(forecast) {
        const forecastLower = forecast.toLowerCase();
        
        if (forecastLower.includes('thundery') || forecastLower.includes('thunderstorm')) {
            return 'Stay indoors or seek shelter. Avoid outdoor activities.';
        }
        if (forecastLower.includes('heavy rain')) {
            return 'Bring umbrella and waterproof gear. Consider postponing outdoor events.';
        }
        if (forecastLower.includes('rain') || forecastLower.includes('showers')) {
            return 'Bring umbrella or raincoat for outdoor activities.';
        }
        if (forecastLower.includes('hazy')) {
            return 'Consider wearing a mask if you have respiratory issues.';
        }
        if (forecastLower.includes('hot') || forecastLower.includes('warm')) {
            return 'Stay hydrated and seek shade during outdoor activities.';
        }
        
        return 'Good weather for outdoor activities!';
    }
    
    // Get weather icon
    getWeatherIcon(forecast) {
        const forecastLower = forecast.toLowerCase();
        
        if (forecastLower.includes('sunny') || forecastLower.includes('fair')) return '☀️';
        if (forecastLower.includes('partly cloudy')) return '⛅';
        if (forecastLower.includes('cloudy')) return '☁️';
        if (forecastLower.includes('thundery') || forecastLower.includes('thunderstorm')) return '⛈️';
        if (forecastLower.includes('heavy rain')) return '🌧️';
        if (forecastLower.includes('rain') || forecastLower.includes('showers')) return '🌦️';
        if (forecastLower.includes('hazy') || forecastLower.includes('mist')) return '🌫️';
        if (forecastLower.includes('windy')) return '🌬️';
        
        return '🌤️'; // default
    }
    
    // Get all available areas
    getAllAreas() {
        const areas = Array.from(this.cache.keys()).map(key => {
            const weather = this.cache.get(key);
            return weather.area;
        }).sort();
        
        return areas;
    }
    
    // Start periodic weather fetching
    startPeriodicFetch() {
        // Fetch immediately
        this.updateWeatherCache();
        
        // Then fetch every 30 minutes
        setInterval(() => {
            console.log('🔄 Periodic weather update...');
            this.updateWeatherCache();
        }, this.CACHE_DURATION);
    }
    
    // Check weather for reminder event
    async checkEventWeather(event) {
        if (!event.isOutdoor || !event.location) {
            return {
                needsWeather: false,
                message: 'Indoor event - no weather check needed'
            };
        }
        
        const weatherResult = await this.getWeatherForArea(event.location);
        
        if (!weatherResult.success) {
            return {
                needsWeather: true,
                error: weatherResult.message,
                location: event.location
            };
        }
        
        return {
            needsWeather: true,
            event: {
                title: event.title,
                location: event.location,
                isOutdoor: event.isOutdoor
            },
            weather: weatherResult.data,
            alert: weatherResult.data.warning ? 'Weather Alert' : null,
            message: weatherResult.data.warning 
                ? `⚠️ Weather warning for ${event.title}: ${weatherResult.data.recommendation}`
                : `✅ Good weather for ${event.title}`
        };
    }
}

// Export singleton instance
const weatherService = new WeatherService();
module.exports = weatherService;
