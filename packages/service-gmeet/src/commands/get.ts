/**
 * uni gmeet get - Get meeting details
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmeet } from '../api';

export const getCommand: Command = {
  name: 'get',
  aliases: ['view', 'show'],
  description: 'Get meeting details',
  args: [
    { name: 'eventId', description: 'Meeting/event ID', required: true },
  ],
  examples: [
    'uni gmeet get EVENT_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const eventId = args.eventId as string;

    const spinner = output.spinner('Fetching meeting...');
    try {
      const meeting = await gmeet.getMeeting(eventId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(meeting);
        return;
      }

      const meetLink = gmeet.getMeetLink(meeting);
      const start = meeting.start.dateTime || meeting.start.date;
      const end = meeting.end.dateTime || meeting.end.date;

      output.log(`Meeting: ${meeting.summary}\n`);
      output.log(`  ID: ${meeting.id}`);
      if (start) output.log(`  Start: ${new Date(start).toLocaleString()}`);
      if (end) output.log(`  End: ${new Date(end).toLocaleString()}`);
      if (meetLink) output.log(`  Meet Link: ${meetLink}`);

      if (meeting.attendees && meeting.attendees.length > 0) {
        output.log(`\n  Attendees (${meeting.attendees.length}):`);
        for (const a of meeting.attendees) {
          const status = a.responseStatus || 'pending';
          output.log(`    - ${a.email} [${status}]`);
        }
      }

      if (meeting.htmlLink) output.log(`\n  Calendar: ${meeting.htmlLink}`);
    } catch (error) {
      spinner.fail('Failed to fetch meeting');
      throw error;
    }
  },
};
