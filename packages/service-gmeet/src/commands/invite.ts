/**
 * uni gmeet invite - Manage meeting attendees
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmeet } from '../api';

export const inviteCommand: Command = {
  name: 'invite',
  aliases: ['attendees'],
  description: 'Add or remove meeting attendees',
  args: [
    { name: 'eventId', description: 'Meeting/event ID', required: true },
  ],
  options: [
    { name: 'add', short: 'a', type: 'string', description: 'Email(s) to add (comma-separated)' },
    { name: 'remove', short: 'r', type: 'string', description: 'Email to remove' },
  ],
  examples: [
    'uni gmeet invite EVENT_ID --add "user@example.com"',
    'uni gmeet invite EVENT_ID --add "alice@example.com,bob@example.com"',
    'uni gmeet invite EVENT_ID --remove "user@example.com"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const eventId = args.eventId as string;

    if (!flags.add && !flags.remove) {
      // Show current attendees
      const meeting = await gmeet.getMeeting(eventId);
      if (globalFlags.json) {
        output.json({ attendees: meeting.attendees || [] });
        return;
      }

      output.log(`Attendees for: ${meeting.summary}\n`);
      if (!meeting.attendees || meeting.attendees.length === 0) {
        output.log('  No attendees');
        return;
      }

      for (const a of meeting.attendees) {
        const status = a.responseStatus || 'pending';
        output.log(`  - ${a.email} [${status}]`);
      }
      return;
    }

    // Add attendees
    if (flags.add) {
      const emails = (flags.add as string).split(',').map(e => e.trim());
      const spinner = output.spinner(`Adding ${emails.length} attendee(s)...`);
      try {
        const meeting = await gmeet.addAttendees(eventId, emails);
        spinner.success(`Added attendees to: ${meeting.summary}`);
        if (globalFlags.json) output.json({ added: emails, meeting });
        return;
      } catch (error) {
        spinner.fail('Failed to add attendees');
        throw error;
      }
    }

    // Remove attendee
    if (flags.remove) {
      const email = flags.remove as string;
      const spinner = output.spinner(`Removing ${email}...`);
      try {
        const meeting = await gmeet.removeAttendee(eventId, email);
        spinner.success(`Removed ${email}`);
        if (globalFlags.json) output.json({ removed: email, meeting });
      } catch (error) {
        spinner.fail('Failed to remove attendee');
        throw error;
      }
    }
  },
};
