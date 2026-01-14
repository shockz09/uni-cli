/**
 * uni gcal get - Get event details
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';

export const getCommand: Command = {
  name: 'get',
  aliases: ['view', 'show'],
  description: 'Get event details',
  args: [
    { name: 'eventId', description: 'Event ID', required: true },
  ],
  options: [
    { name: 'calendar', short: 'c', type: 'string', description: 'Calendar ID (default: primary)' },
  ],
  examples: [
    'uni gcal get EVENT_ID',
    'uni gcal get EVENT_ID --calendar work',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }

    const eventId = args.eventId as string;
    const calendarId = (flags.calendar as string) || 'primary';

    const spinner = output.spinner('Fetching event...');
    try {
      const event = await gcal.getEvent(eventId, calendarId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(event);
        return;
      }

      output.info(`Event: ${event.summary}\n`);
      output.info(`  ID: ${event.id}`);
      output.info(`  Status: ${event.status}`);

      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;
      if (start) output.info(`  Start: ${new Date(start).toLocaleString()}`);
      if (end) output.info(`  End: ${new Date(end).toLocaleString()}`);

      if (event.location) output.info(`  Location: ${event.location}`);
      if (event.description) output.info(`  Description: ${event.description}`);

      if (event.attendees && event.attendees.length > 0) {
        output.info(`\n  Attendees (${event.attendees.length}):`);
        for (const attendee of event.attendees) {
          const status = attendee.responseStatus || 'pending';
          const organizer = attendee.organizer ? ' (organizer)' : '';
          output.info(`    - ${attendee.email} [${status}]${organizer}`);
        }
      }

      if (event.recurrence) {
        output.info(`\n  Recurrence: ${event.recurrence.join(', ')}`);
      }

      if (event.reminders?.overrides) {
        output.info(`\n  Reminders:`);
        for (const r of event.reminders.overrides) {
          output.info(`    - ${r.method}: ${r.minutes} minutes before`);
        }
      }

      output.info(`\n  Link: ${event.htmlLink}`);
    } catch (error) {
      spinner.fail('Failed to fetch event');
      throw error;
    }
  },
};
