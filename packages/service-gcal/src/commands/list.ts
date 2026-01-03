/**
 * uni gcal list - List calendar events
 */

import type { Command, CommandContext } from '@uni/shared';
import { timestamp, c } from '@uni/shared';
import { gcal } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List calendar events',
  aliases: ['ls', 'events'],
  options: [
    {
      name: 'date',
      short: 'd',
      type: 'string',
      description: 'Date to show events for (today, tomorrow, YYYY-MM-DD)',
      default: 'today',
    },
    {
      name: 'days',
      short: 'n',
      type: 'number',
      description: 'Number of days to show',
      default: 1,
    },
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Maximum number of events',
      default: 20,
    },
  ],
  examples: [
    'uni gcal list',
    'uni gcal list --date tomorrow',
    'uni gcal list --days 7',
    'uni gcal list --date 2025-01-15',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gcal.hasCredentials()) {
      output.error('Google Calendar credentials not configured.');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      output.info('Create credentials at: https://console.cloud.google.com/apis/credentials');
      return;
    }

    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching events...');

    try {
      // Parse date
      let startDate = new Date();
      const dateStr = flags.date as string;

      if (dateStr === 'tomorrow') {
        startDate.setDate(startDate.getDate() + 1);
      } else if (dateStr !== 'today' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        startDate = new Date(dateStr);
      }

      // Set to start of day
      startDate.setHours(0, 0, 0, 0);

      // Calculate end date
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (flags.days as number));
      endDate.setHours(23, 59, 59, 999);

      const events = await gcal.listEvents({
        timeMin: startDate,
        timeMax: endDate,
        maxResults: flags.limit as number,
      });

      spinner.success(`Found ${events.length} event${events.length === 1 ? '' : 's'}`);

      if (globalFlags.json) {
        output.json(events);
        return;
      }

      if (events.length === 0) {
        output.info('No events scheduled');
        return;
      }

      console.log('');

      // Group by date
      const byDate = new Map<string, typeof events>();
      for (const event of events) {
        const eventDate = event.start.dateTime || event.start.date || '';
        const dateKey = eventDate.split('T')[0];
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, []);
        }
        byDate.get(dateKey)!.push(event);
      }

      for (const [date, dayEvents] of byDate) {
        const dateObj = new Date(date);
        const dateLabel = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
        console.log(c.bold(`📅 ${dateLabel}`));

        for (const event of dayEvents) {
          const isAllDay = !event.start.dateTime;
          let timeStr = 'All day';

          if (!isAllDay && event.start.dateTime) {
            const start = new Date(event.start.dateTime);
            const end = event.end.dateTime ? new Date(event.end.dateTime) : null;

            timeStr = start.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            if (end) {
              timeStr += ` - ${end.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}`;
            }
          }

          const status = event.status === 'cancelled' ? ` ${c.red('[cancelled]')}` : '';
          console.log(`  ${c.cyan(timeStr)} ${event.summary}${status}`);

          if (event.location) {
            console.log(`    ${c.dim(`📍 ${event.location}`)}`);
          }
        }
        console.log('');
      }
      console.log(c.dim(timestamp()));
    } catch (error) {
      spinner.fail('Failed to fetch events');
      throw error;
    }
  },
};
