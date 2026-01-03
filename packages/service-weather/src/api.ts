/**
 * Weather API client using Open-Meteo (free, no API key required)
 */

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

export interface GeoLocation {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  conditionCode: number;
}

export interface DayForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  conditionCode: number;
  precipitation: number;
}

export interface WeatherData {
  location: GeoLocation;
  current: CurrentWeather;
  forecast?: DayForecast[];
}

// WMO Weather codes to human-readable conditions
const WMO_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function getCondition(code: number): string {
  return WMO_CODES[code] || 'Unknown';
}

export async function geocode(query: string): Promise<GeoLocation | null> {
  const url = `${GEOCODING_API}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return null;
  }

  const result = data.results[0];
  return {
    name: result.name,
    country: result.country_code || result.country,
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

export async function getWeather(
  latitude: number,
  longitude: number,
  forecastDays: number = 0
): Promise<{ current: CurrentWeather; forecast?: DayForecast[] }> {
  let url = `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;

  if (forecastDays > 0) {
    url += `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&forecast_days=${Math.min(forecastDays, 7)}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API failed: ${response.statusText}`);
  }

  const data = await response.json();

  const current: CurrentWeather = {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    condition: getCondition(data.current.weather_code),
    conditionCode: data.current.weather_code,
  };

  let forecast: DayForecast[] | undefined;
  if (data.daily) {
    forecast = data.daily.time.map((date: string, i: number) => ({
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      condition: getCondition(data.daily.weather_code[i]),
      conditionCode: data.daily.weather_code[i],
      precipitation: data.daily.precipitation_sum[i],
    }));
  }

  return { current, forecast };
}

export async function getWeatherByCity(
  city: string,
  forecastDays: number = 0
): Promise<WeatherData | null> {
  const location = await geocode(city);
  if (!location) {
    return null;
  }

  const weather = await getWeather(location.latitude, location.longitude, forecastDays);

  return {
    location,
    ...weather,
  };
}

export async function getWeatherByCoords(
  latitude: number,
  longitude: number,
  forecastDays: number = 0
): Promise<WeatherData> {
  const weather = await getWeather(latitude, longitude, forecastDays);

  return {
    location: {
      name: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      country: '',
      latitude,
      longitude,
    },
    ...weather,
  };
}

// Convert Celsius to Fahrenheit
export function toFahrenheit(celsius: number): number {
  return Math.round((celsius * 9/5) + 32);
}

// Convert km/h to mph
export function toMph(kmh: number): number {
  return Math.round(kmh * 0.621371);
}
