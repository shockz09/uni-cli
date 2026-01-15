/**
 * uni weather hourly - Get hourly weather forecast
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getHourlyByCity, toFahrenheit, toMph, geocode, getHourlyForecast } from '../api';

// Weather emoji based on condition code
function getWeatherEmoji(code: number): string {
  if (code === 0) return '';
  if (code <= 3) return '';
  if (code <= 48) return '';
  if (code <= 57) return '';
  if (code <= 67) return '';
  if (code <= 77) return '';
  if (code <= 82) return '';
  if (code >= 95) return '';
  return '';
}

export const hourlyCommand: Command = {
  name: 'hourly',
  aliases: ['h'],
  description: 'Get hourly weather forecast',
  args: [
    {
      name: 'location',
      description: 'City name or lat,long coordinates',
      required: true,
    },
  ],
  options: [
    {
      name: 'hours',
      short: 'n',
      type: 'number',
      description: 'Number of hours (default: 24, max: 168)',
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
    'uni weather hourly London',
    'uni weather hourly Tokyo --hours 48',
    'uni weather hourly "New York" -u fahrenheit',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const location = args.location as string;
    const hours = Math.min((flags.hours as number) || 24, 168);
    const units = (flags.units as string) || 'celsius';
    const useFahrenheit = units.toLowerCase().startsWith('f');

    const spinner = output.spinner('Fetching hourly forecast...');

    try {
      // Check if location is coordinates (lat,long)
      const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      let hourlyData;
      let locationStr: string;

      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        const hourly = await getHourlyForecast(lat, lon, hours);
        hourlyData = hourly;
        locationStr = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      } else {
        const result = await getHourlyByCity(location, hours);
        if (!result) {
          spinner.fail('Location not found');
          output.error('Could not find location. Try a different city name or use coordinates.');
          return;
        }
        hourlyData = result.hourly;
        locationStr = result.location.country
          ? `${result.location.name}, ${result.location.country}`
          : result.location.name;
      }

      spinner.success('Hourly forecast fetched');

      if (globalFlags.json) {
        output.json({ location: locationStr, hourly: hourlyData });
        return;
      }

      output.info('');
      output.info(c.bold(`${locationStr} - Hourly Forecast`));
      output.info('');

      // Group by day
      let currentDate = '';
      for (const hour of hourlyData) {
        const dt = new Date(hour.time);
        const dateStr = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        if (dateStr !== currentDate) {
          if (currentDate) output.info('');
          output.info(c.bold(`  ${dateStr}`));
          currentDate = dateStr;
        }

        const emoji = getWeatherEmoji(hour.conditionCode);
        const temp = useFahrenheit
          ? `${toFahrenheit(hour.temperature)}°F`
          : `${Math.round(hour.temperature)}°C`;
        const precip = hour.precipitation > 0 ? ` ${hour.precipitation}mm` : '';

        output.info(`    ${timeStr.padEnd(9)} ${emoji} ${temp.padEnd(6)} ${hour.condition}${precip}`);
      }

      output.info('');
    } catch (error) {
      spinner.fail('Failed to fetch hourly forecast');
      throw error;
    }
  },
};
