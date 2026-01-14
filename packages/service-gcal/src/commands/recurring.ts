/**
 * uni gcal recurring - Create recurring events
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';

export const recurringCommand: Command = {
  name: 'recurring',
  aliases: ['repeat'],
  description: 'Create a recurring event',
  args: [
    { name: 'title', description: 'Event title', required: true },
    { name: 'datetime', description: 'Start date/time (ISO or natural)', required: true },
  ],
  options: [
    { name: 'duration', short: 'd', type: 'string', description: 'Duration in minutes (default: 60)' },
    { name: 'freq', short: 'f', type: 'string', description: 'Frequency: daily, weekly, monthly, yearly' },
    { name: 'count', short: 'n', type: 'string', description: 'Number of occurrences' },
    { name: 'until', short: 'u', type: 'string', description: 'End date (YYYY-MM-DD)' },
    { name: 'days', type: 'string', description: 'Days of week for weekly (MO,TU,WE,TH,FR,SA,SU)' },
    { name: 'interval', short: 'i', type: 'string', description: 'Interval (e.g., 2 for every 2 weeks)' },
    { name: 'calendar', short: 'c', type: 'string', description: 'Calendar ID (default: primary)' },
    { name: 'location', short: 'l', type: 'string', description: 'Event location' },
  ],
  examples: [
    'uni gcal recurring "Daily Standup" "2024-01-15T09:00:00" --freq daily --count 30',
    'uni gcal recurring "Weekly Team Meeting" "2024-01-15T14:00:00" --freq weekly --days MO,WE,FR',
    'uni gcal recurring "Monthly Review" "2024-01-15T10:00:00" --freq monthly --until 2024-12-31',
    'uni gcal recurring "Bi-weekly Sync" "2024-01-15T15:00:00" --freq weekly --interval 2',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }

    const title = args.title as string;
    const datetime = args.datetime as string;
    const duration = parseInt((flags.duration as string) || '60', 10);
    const freq = ((flags.freq as string) || 'weekly').toUpperCase();
    const calendarId = (flags.calendar as string) || 'primary';

    // Parse start time
    const start = new Date(datetime);
    if (isNaN(start.getTime())) {
      output.error('Invalid datetime format. Use ISO format like 2024-01-15T09:00:00');
      return;
    }
    const end = new Date(start.getTime() + duration * 60 * 1000);

    // Build RRULE
    const rruleParts = [`FREQ=${freq}`];
    if (flags.interval) rruleParts.push(`INTERVAL=${flags.interval}`);
    if (flags.count) rruleParts.push(`COUNT=${flags.count}`);
    if (flags.until) rruleParts.push(`UNTIL=${(flags.until as string).replace(/-/g, '')}T235959Z`);
    if (flags.days) rruleParts.push(`BYDAY=${flags.days}`);

    const recurrence = [`RRULE:${rruleParts.join(';')}`];

    const spinner = output.spinner('Creating recurring event...');
    try {
      const event = await gcal.createRecurringEvent(
        {
          summary: title,
          location: flags.location as string | undefined,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
        },
        recurrence,
        calendarId
      );
      spinner.success(`Created: ${event.summary}`);

      if (globalFlags.json) {
        output.json(event);
        return;
      }

      output.log(`  Recurrence: ${recurrence[0]}`);
      output.log(`  First occurrence: ${start.toLocaleString()}`);
      output.log(`  Link: ${event.htmlLink}`);
    } catch (error) {
      spinner.fail('Failed to create recurring event');
      throw error;
    }
  },
};
