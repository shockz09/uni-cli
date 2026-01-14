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

      output.log(`Event: ${event.summary}\n`);
      output.log(`  ID: ${event.id}`);
      output.log(`  Status: ${event.status}`);

      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;
      if (start) output.log(`  Start: ${new Date(start).toLocaleString()}`);
      if (end) output.log(`  End: ${new Date(end).toLocaleString()}`);

      if (event.location) output.log(`  Location: ${event.location}`);
      if (event.description) output.log(`  Description: ${event.description}`);

      if (event.attendees && event.attendees.length > 0) {
        output.log(`\n  Attendees (${event.attendees.length}):`);
        for (const attendee of event.attendees) {
          const status = attendee.responseStatus || 'pending';
          const organizer = attendee.organizer ? ' (organizer)' : '';
          output.log(`    - ${attendee.email} [${status}]${organizer}`);
        }
      }

      if (event.recurrence) {
        output.log(`\n  Recurrence: ${event.recurrence.join(', ')}`);
      }

      if (event.reminders?.overrides) {
        output.log(`\n  Reminders:`);
        for (const r of event.reminders.overrides) {
          output.log(`    - ${r.method}: ${r.minutes} minutes before`);
        }
      }

      output.log(`\n  Link: ${event.htmlLink}`);
    } catch (error) {
      spinner.fail('Failed to fetch event');
      throw error;
    }
  },
};
