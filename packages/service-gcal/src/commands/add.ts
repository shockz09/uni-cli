/**
 * uni gcal add - Create a calendar event
 */

import type { Command, CommandContext } from '@uni/shared';
import { timestamp } from '@uni/shared';
import { gcal } from '../api';

/**
 * Parse a time string like "10am", "2:30pm", "14:00" into hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  // Try 24-hour format (14:00)
  let match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return { hours: parseInt(match[1]), minutes: parseInt(match[2]) };
  }

  // Try 12-hour format (10am, 2:30pm)
  match = timeStr.toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3];

    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    return { hours, minutes };
  }

  return null;
}

/**
 * Parse duration string like "30m", "1h", "1h30m" into minutes
 */
function parseDuration(durationStr: string): number | null {
  let totalMinutes = 0;

  // Match hours
  const hoursMatch = durationStr.match(/(\d+)\s*h/i);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]) * 60;
  }

  // Match minutes
  const minsMatch = durationStr.match(/(\d+)\s*m/i);
  if (minsMatch) {
    totalMinutes += parseInt(minsMatch[1]);
  }

  // If just a number, assume minutes
  if (!hoursMatch && !minsMatch) {
    const num = parseInt(durationStr);
    if (!isNaN(num)) {
      totalMinutes = num;
    }
  }

  return totalMinutes > 0 ? totalMinutes : null;
}

export const addCommand: Command = {
  name: 'add',
  description: 'Create a calendar event',
  aliases: ['create', 'new'],
  args: [
    {
      name: 'title',
      description: 'Event title',
      required: true,
    },
  ],
  options: [
    {
      name: 'time',
      short: 't',
      type: 'string',
      description: 'Start time (e.g., 10am, 14:30)',
      required: true,
    },
    {
      name: 'duration',
      short: 'd',
      type: 'string',
      description: 'Duration (e.g., 30m, 1h, 1h30m)',
      default: '1h',
    },
    {
      name: 'date',
      type: 'string',
      description: 'Date (today, tomorrow, YYYY-MM-DD)',
      default: 'today',
    },
    {
      name: 'location',
      short: 'l',
      type: 'string',
      description: 'Event location',
    },
    {
      name: 'description',
      type: 'string',
      description: 'Event description',
    },
  ],
  examples: [
    'uni gcal add "Team standup" --time 10am --duration 30m',
    'uni gcal add "Lunch with Bob" --time 12:30pm --date tomorrow',
    'uni gcal add "Meeting" --time 2pm --location "Conference Room A"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gcal.hasCredentials()) {
      output.error('Google Calendar credentials not configured.');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      return;
    }

    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }

    const title = args.title;
    if (!title) {
      output.error('Please provide an event title');
      return;
    }

    // Parse time
    const timeStr = flags.time as string;
    const parsedTime = parseTime(timeStr);
    if (!parsedTime) {
      output.error(`Invalid time format: ${timeStr}. Use formats like 10am, 2:30pm, or 14:00`);
      return;
    }

    // Parse duration
    const durationStr = flags.duration as string;
    const durationMinutes = parseDuration(durationStr);
    if (!durationMinutes) {
      output.error(`Invalid duration: ${durationStr}. Use formats like 30m, 1h, or 1h30m`);
      return;
    }

    // Parse date
    let eventDate = new Date();
    const dateStr = flags.date as string;

    if (dateStr === 'tomorrow') {
      eventDate.setDate(eventDate.getDate() + 1);
    } else if (dateStr !== 'today' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      eventDate = new Date(dateStr);
    }

    // Set start time
    const startTime = new Date(eventDate);
    startTime.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

    // Calculate end time
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // Get timezone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const spinner = output.spinner('Creating event...');

    try {
      const event = await gcal.createEvent({
        summary: title,
        description: flags.description as string | undefined,
        location: flags.location as string | undefined,
        start: { dateTime: startTime.toISOString(), timeZone },
        end: { dateTime: endTime.toISOString(), timeZone },
      });

      spinner.success('Event created');

      if (globalFlags.json) {
        output.json(event);
        return;
      }

      const startStr = startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const endStr = endTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const dateLabel = startTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      console.log('');
      console.log(`\x1b[1m📅 ${event.summary}\x1b[0m`);
      console.log(`   ${dateLabel}`);
      console.log(`   \x1b[36m${startStr} - ${endStr}\x1b[0m`);
      if (event.location) {
        console.log(`   \x1b[90m📍 ${event.location}\x1b[0m`);
      }
      console.log(`   \x1b[90m${event.htmlLink}\x1b[0m`);
      console.log('');
      console.log(`\x1b[90m${timestamp()}\x1b[0m`);
    } catch (error) {
      spinner.fail('Failed to create event');
      throw error;
    }
  },
};
