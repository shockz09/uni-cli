/**
 * uni gcal invite - Manage event attendees
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';

export const inviteCommand: Command = {
  name: 'invite',
  aliases: ['attendees'],
  description: 'Add or remove attendees from an event',
  args: [
    { name: 'eventId', description: 'Event ID', required: true },
  ],
  options: [
    { name: 'add', short: 'a', type: 'string', description: 'Email(s) to add (comma-separated)' },
    { name: 'remove', short: 'r', type: 'string', description: 'Email to remove' },
    { name: 'calendar', short: 'c', type: 'string', description: 'Calendar ID (default: primary)' },
  ],
  examples: [
    'uni gcal invite EVENT_ID --add "john@example.com"',
    'uni gcal invite EVENT_ID --add "alice@example.com,bob@example.com"',
    'uni gcal invite EVENT_ID --remove "john@example.com"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }

    const eventId = args.eventId as string;
    const calendarId = (flags.calendar as string) || 'primary';

    if (!flags.add && !flags.remove) {
      // Show current attendees
      const event = await gcal.getEvent(eventId, calendarId);
      if (globalFlags.json) {
        output.json({ attendees: event.attendees || [] });
        return;
      }

      output.info(`Attendees for: ${event.summary}\n`);
      if (!event.attendees || event.attendees.length === 0) {
        output.info('  No attendees');
        return;
      }

      for (const attendee of event.attendees) {
        const status = attendee.responseStatus || 'pending';
        const organizer = attendee.organizer ? ' (organizer)' : '';
        output.info(`  - ${attendee.email} [${status}]${organizer}`);
      }
      return;
    }

    // Add attendees
    if (flags.add) {
      const emails = (flags.add as string).split(',').map(e => e.trim());
      const spinner = output.spinner(`Adding ${emails.length} attendee(s)...`);
      try {
        const event = await gcal.addAttendees(eventId, emails, calendarId);
        spinner.success(`Added attendees to: ${event.summary}`);

        if (globalFlags.json) {
          output.json({ added: emails, attendees: event.attendees });
        }
      } catch (error) {
        spinner.fail('Failed to add attendees');
        throw error;
      }
      return;
    }

    // Remove attendee
    if (flags.remove) {
      const email = flags.remove as string;
      const spinner = output.spinner(`Removing ${email}...`);
      try {
        const event = await gcal.removeAttendee(eventId, email, calendarId);
        spinner.success(`Removed ${email} from: ${event.summary}`);

        if (globalFlags.json) {
          output.json({ removed: email, attendees: event.attendees });
        }
      } catch (error) {
        spinner.fail('Failed to remove attendee');
        throw error;
      }
    }
  },
};
