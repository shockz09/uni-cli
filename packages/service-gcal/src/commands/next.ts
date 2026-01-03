/**
 * uni gcal next - Show next upcoming event
 */

import type { Command, CommandContext } from '@uni/shared';
import { timestamp } from '@uni/shared';
import { gcal } from '../api';

export const nextCommand: Command = {
  name: 'next',
  description: 'Show next upcoming event',
  aliases: ['upcoming'],
  options: [
    {
      name: 'count',
      short: 'n',
      type: 'number',
      description: 'Number of upcoming events to show',
      default: 1,
    },
  ],
  examples: [
    'uni gcal next',
    'uni gcal next --count 3',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gcal.hasCredentials()) {
      output.error('Google Calendar credentials not configured.');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      return;
    }

    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching next event...');

    try {
      const events = await gcal.listEvents({
        maxResults: flags.count as number,
      });

      spinner.stop();

      if (globalFlags.json) {
        output.json(events);
        return;
      }

      if (events.length === 0) {
        output.info('No upcoming events');
        return;
      }

      console.log('');

      for (const event of events) {
        const isAllDay = !event.start.dateTime;
        const eventDate = new Date(event.start.dateTime || event.start.date || '');

        const dateLabel = eventDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });

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

        // Calculate time until event
        const now = Date.now();
        const eventTime = eventDate.getTime();
        const diffMs = eventTime - now;

        let untilStr = '';
        if (diffMs > 0) {
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 60) {
            untilStr = `in ${diffMins} minute${diffMins === 1 ? '' : 's'}`;
          } else if (diffMins < 1440) {
            const hours = Math.floor(diffMins / 60);
            untilStr = `in ${hours} hour${hours === 1 ? '' : 's'}`;
          } else {
            const days = Math.floor(diffMins / 1440);
            untilStr = `in ${days} day${days === 1 ? '' : 's'}`;
          }
        } else {
          untilStr = 'now';
        }

        console.log(`\x1b[1m📅 ${event.summary}\x1b[0m \x1b[33m(${untilStr})\x1b[0m`);
        console.log(`   ${dateLabel}`);
        console.log(`   \x1b[36m${timeStr}\x1b[0m`);
        if (event.location) {
          console.log(`   \x1b[90m📍 ${event.location}\x1b[0m`);
        }
        console.log('');
      }
      console.log(`\x1b[90m${timestamp()}\x1b[0m`);
    } catch (error) {
      spinner.fail('Failed to fetch events');
      throw error;
    }
  },
};
