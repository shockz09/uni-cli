/**
 * uni weather - Get weather forecasts
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getWeatherByCity, getWeatherByCoords, toFahrenheit, toMph, type WeatherData } from '../api';

// Weather emoji based on condition code
function getWeatherEmoji(code: number): string {
  if (code === 0) return ''; // Clear
  if (code <= 3) return ''; // Partly cloudy
  if (code <= 48) return ''; // Fog
  if (code <= 57) return ''; // Drizzle
  if (code <= 67) return ''; // Rain
  if (code <= 77) return ''; // Snow
  if (code <= 82) return ''; // Showers
  if (code >= 95) return ''; // Thunderstorm
  return '';
}

export const weatherCommand: Command = {
  name: '',  // Default command - runs when no subcommand given
  description: 'Get weather for a location',
  args: [
    {
      name: 'location',
      description: 'City name or lat,long coordinates',
      required: false,
    },
  ],
  options: [
    {
      name: 'forecast',
      short: 'f',
      type: 'number',
      description: 'Number of days to forecast (1-7)',
    },
    {
      name: 'units',
      short: 'u',
      type: 'string',
      description: 'Temperature units: celsius or fahrenheit',
      default: 'celsius',
    },
  ],
  examples: [
    'uni weather London',
    'uni weather "New York, US"',
    'uni weather Tokyo --forecast 3',
    'uni weather London --units fahrenheit',
    'uni weather 40.7128,-74.0060',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const location = args.location as string | undefined;
    const forecastDays = (flags.forecast as number) || 0;
    const units = (flags.units as string) || 'celsius';
    const useFahrenheit = units.toLowerCase().startsWith('f');

    if (!location) {
      output.error('Location required. Example: uni weather London');
      return;
    }

    const spinner = output.spinner('Fetching weather...');

    try {
      let data: WeatherData | null = null;

      // Check if location is coordinates (lat,long)
      const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        data = await getWeatherByCoords(lat, lon, forecastDays);
      } else {
        data = await getWeatherByCity(location, forecastDays);
      }

      if (!data) {
        spinner.fail('Location not found');
        output.error('Could not find location. Try a different city name or use coordinates.');
        return;
      }

      spinner.success('Weather data fetched');

      if (globalFlags.json) {
        output.json(data);
        return;
      }

      // Display location
      const locationStr = data.location.country
        ? `${data.location.name}, ${data.location.country}`
        : data.location.name;
      console.log('');
      console.log(c.bold(locationStr));
      console.log('');

      // Current weather
      const { current } = data;
      const emoji = getWeatherEmoji(current.conditionCode);
      const temp = useFahrenheit
        ? `${toFahrenheit(current.temperature)}°F`
        : `${Math.round(current.temperature)}°C`;
      const feelsLike = useFahrenheit
        ? `${toFahrenheit(current.feelsLike)}°F`
        : `${Math.round(current.feelsLike)}°C`;
      const wind = useFahrenheit
        ? `${toMph(current.windSpeed)} mph`
        : `${Math.round(current.windSpeed)} km/h`;

      console.log(`  ${emoji} ${temp}, ${current.condition}`);
      console.log(`  ${c.dim(`Feels like: ${feelsLike}`)}`);
      console.log(`  ${c.dim(`Humidity: ${current.humidity}% | Wind: ${wind}`)}`);

      // Forecast
      if (data.forecast && data.forecast.length > 0) {
        console.log('');
        console.log(c.bold('Forecast:'));
        console.log('');

        for (const day of data.forecast) {
          const date = new Date(day.date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayEmoji = getWeatherEmoji(day.conditionCode);
          const high = useFahrenheit ? `${toFahrenheit(day.tempMax)}°F` : `${Math.round(day.tempMax)}°C`;
          const low = useFahrenheit ? `${toFahrenheit(day.tempMin)}°F` : `${Math.round(day.tempMin)}°C`;

          console.log(`  ${dayName.padEnd(4)} ${dayEmoji} ${high}/${low}  ${day.condition}`);
        }
      }

      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch weather');
      throw error;
    }
  },
};
