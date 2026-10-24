import { WeatherData } from '../../types';

interface DistrictCoordinates {
  latitude: number;
  longitude: number;
  province: string;
}

const DISTRICT_COORDS: Record<string, DistrictCoordinates> = {
  'Nuwara Eliya': { latitude: 6.9744, longitude: 80.7828, province: 'Central Province' },
  'Kandy': { latitude: 7.2906, longitude: 80.6337, province: 'Central Province' },
  'Badulla': { latitude: 6.9934, longitude: 81.0550, province: 'Uva Province' },
  'Matale': { latitude: 7.4675, longitude: 80.6234, province: 'Central Province' },
  'Anuradhapura': { latitude: 8.3114, longitude: 80.4037, province: 'North Central Province' },
  'Polonnaruwa': { latitude: 7.9403, longitude: 81.0188, province: 'North Central Province' },
  'Kurunegala': { latitude: 7.4863, longitude: 80.3623, province: 'North Western Province' },
  'Colombo': { latitude: 6.9271, longitude: 79.8612, province: 'Western Province' },
  'Hambantota': { latitude: 6.1248, longitude: 81.1185, province: 'Southern Province' },
  'Galle': { latitude: 6.0329, longitude: 80.2168, province: 'Southern Province' },
  'Jaffna': { latitude: 9.6615, longitude: 80.0255, province: 'Northern Province' },
};

interface WeatherCacheEntry {
  cachedAt: number;
  data: WeatherData & {
    provider: string;
    isLive: boolean;
    providerStatus: string;
    lastUpdated: string;
    cachedAt: number;
  };
}

const weatherCache = new Map<string, WeatherCacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export class WeatherService {
  public static async getDistrictWeather(district: string) {
    const coords = DISTRICT_COORDS[district] || DISTRICT_COORDS['Nuwara Eliya'];
    const now = Date.now();

    // Check cache
    const cached = weatherCache.get(district);
    if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      // Query Open-Meteo meteorological API (Public, high-precision)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`;

      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (!response.ok) {
        throw new Error(`Open-Meteo returned status ${response.status}`);
      }

      const raw = await response.json();
      const current = raw.current;
      const daily = raw.daily;

      // Map weather code to descriptive conditions
      const condition = WeatherService.mapWmoCode(current.weather_code);

      // Generate 5-day forecast objects
      const forecastDays = (daily.time || []).map((dateStr: string, idx: number) => {
        const dateObj = new Date(dateStr);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        return {
          day: dayName,
          date: dateStr,
          tempHigh: Math.round(daily.temperature_2m_max[idx] || 25),
          tempLow: Math.round(daily.temperature_2m_min[idx] || 16),
          tempMax: Math.round(daily.temperature_2m_max[idx] || 25),
          tempMin: Math.round(daily.temperature_2m_min[idx] || 16),
          condition: WeatherService.mapWmoCode(daily.weather_code[idx]),
          rainProbability: Math.round(daily.precipitation_probability_max[idx] || 20),
          rainfallProb: Math.round(daily.precipitation_probability_max[idx] || 20),
        };
      });

      // Derive agronomic advisories based on real meteorological thresholds
      const alerts: string[] = [];
      const temp = Math.round(current.temperature_2m);
      const humidity = Math.round(current.relative_humidity_2m);
      const rainfall = current.precipitation || 0;

      if (humidity > 80 && temp < 22) {
        alerts.push('High relative humidity and cool temperatures elevate risk of Tea Blister Blight (Exobasidium vexans). Maintain copper hydroxide preventative foliar coverage.');
      }
      if (temp > 32) {
        alerts.push('Elevated thermal stress detected. Verify drip irrigation frequency and apply soil mulching on exposed nursery beds.');
      }
      if (current.wind_speed_10m > 25) {
        alerts.push('Strong wind gusts. Delay chemical pesticide spraying to avoid drift contamination.');
      }
      if (rainfall > 15) {
        alerts.push('Heavy precipitation recorded. Inspect canal drainage to prevent root waterlogging in low-lying paddy plots.');
      }
      if (alerts.length === 0) {
        alerts.push('Favorable microclimate for routine weeding, plucking, and foliar fertilizing operations.');
      }

      const weatherResult = {
        district,
        province: coords.province,
        temperature: temp,
        temperatureC: temp,
        feelsLikeC: Math.round(current.apparent_temperature || temp),
        humidity,
        humidityPercent: humidity,
        rainfallMm: rainfall,
        rainfallForecast: `${forecastDays[0]?.rainProbability || 30}%`,
        condition,
        windSpeed: `${Math.round(current.wind_speed_10m)} km/h`,
        windSpeedKmh: Math.round(current.wind_speed_10m),
        alerts,
        agriculturalAdvisory: alerts.join(' '),
        forecast: forecastDays,
        forecast5Days: forecastDays,
        provider: 'Open-Meteo Atmospheric Grid (Global Numerical Weather Prediction)',
        isLive: true,
        providerStatus: 'operational_live',
        lastUpdated: new Date().toISOString(),
        cachedAt: now,
      };

      weatherCache.set(district, { cachedAt: now, data: weatherResult });
      return weatherResult;
    } catch (err: any) {
      console.warn(`[WeatherService] Fetch failed for ${district} (${err.message}), using fallback model.`);

      // If existing cache exists, return it with offline flag
      if (cached) {
        return {
          ...cached.data,
          isLive: false,
          providerStatus: 'cached_offline',
        };
      }

      // Default baseline model when API is unreachable
      const fallbackResult = {
        district,
        province: coords.province,
        temperature: district === 'Nuwara Eliya' ? 19 : 28,
        temperatureC: district === 'Nuwara Eliya' ? 19 : 28,
        feelsLikeC: district === 'Nuwara Eliya' ? 18 : 30,
        humidity: district === 'Nuwara Eliya' ? 78 : 72,
        humidityPercent: district === 'Nuwara Eliya' ? 78 : 72,
        rainfallMm: 0,
        rainfallForecast: '40%',
        condition: 'Partly Cloudy',
        windSpeed: '12 km/h',
        windSpeedKmh: 12,
        alerts: ['Local weather provider unreachable. Displaying regional baseline averages.'],
        agriculturalAdvisory: 'Local weather provider unreachable. Displaying regional baseline averages.',
        forecast: [
          { day: 'Mon', date: 'Day 1', tempHigh: 21, tempLow: 13, tempMax: 21, tempMin: 13, condition: 'Scattered Showers', rainProbability: 60, rainfallProb: 60 },
          { day: 'Tue', date: 'Day 2', tempHigh: 22, tempLow: 14, tempMax: 22, tempMin: 14, condition: 'Partly Cloudy', rainProbability: 35, rainfallProb: 35 },
          { day: 'Wed', date: 'Day 3', tempHigh: 20, tempLow: 12, tempMax: 20, tempMin: 12, condition: 'Light Rain', rainProbability: 55, rainfallProb: 55 },
          { day: 'Thu', date: 'Day 4', tempHigh: 23, tempLow: 13, tempMax: 23, tempMin: 13, condition: 'Sunny Spells', rainProbability: 25, rainfallProb: 25 },
          { day: 'Fri', date: 'Day 5', tempHigh: 22, tempLow: 14, tempMax: 22, tempMin: 14, condition: 'Mild Fog', rainProbability: 30, rainfallProb: 30 },
        ],
        forecast5Days: [
          { day: 'Mon', date: 'Day 1', tempMax: 21, tempMin: 13, condition: 'Scattered Showers', rainfallProb: 60 },
          { day: 'Tue', date: 'Day 2', tempMax: 22, tempMin: 14, condition: 'Partly Cloudy', rainfallProb: 35 },
          { day: 'Wed', date: 'Day 3', tempMax: 20, tempMin: 12, condition: 'Light Rain', rainfallProb: 55 },
          { day: 'Thu', date: 'Day 4', tempMax: 23, tempMin: 13, condition: 'Sunny Spells', rainfallProb: 25 },
          { day: 'Fri', date: 'Day 5', tempMax: 22, tempMin: 14, condition: 'Mild Fog', rainfallProb: 30 },
        ],
        provider: 'Sri Lanka Agro-Climatic Regional Baseline (Offline Fallback)',
        isLive: false,
        providerStatus: 'offline_fallback',
        lastUpdated: new Date().toISOString(),
        cachedAt: now,
      };

      return fallbackResult;
    }
  }

  private static mapWmoCode(code: number): string {
    if (code === 0) return 'Clear Sky';
    if (code === 1 || code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Fog & Mist';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 61 && code <= 65) return 'Rain Showers';
    if (code >= 71 && code <= 75) return 'Hail / Solid Precip';
    if (code >= 80 && code <= 82) return 'Heavy Rain Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Scattered Clouds';
  }
}
