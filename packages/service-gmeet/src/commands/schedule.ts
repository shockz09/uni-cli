/**
 * uni gmeet schedule - Schedule a meeting
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmeet } from '../api';

export const scheduleCommand: Command = {
  name: 'schedule',
  description: 'Schedule a meeting for later',
  aliases: ['plan'],
  args: [
    {
      name: 'title',
      description: 'Meeting title',
      required: true,
    },
  ],
  options: [
    {
      name: 'date',
      short: 'd',
      type: 'string',
      description: 'Date (today, tomorrow, YYYY-MM-DD)',
      default: 'today',
    },
    {
      name: 'time',
      short: 't',
      type: 'string',
      description: 'Time (e.g., 2pm, 14:00)',
      required: true,
    },
    {
      name: 'duration',
      type: 'number',
      description: 'Duration in minutes',
      default: 30,
    },
    {
      name: 'invite',
      short: 'i',
      type: 'string',
      description: 'Comma-separated emails to invite',
    },
  ],
  examples: [
    'uni gmeet schedule "Team Sync" --date tomorrow --time 10am',
    'uni gmeet schedule "1:1" --time 3pm --invite john@example.com',
    'uni gmeet schedule "Review" --date 2026-01-10 --time 2pm --duration 60',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const title = args.title as string;
    const spinner = output.spinner(`Scheduling "${title}"...`);

    try {
      // Parse date
      let date = new Date();
      const dateStr = flags.date as string;

      if (dateStr === 'tomorrow') {
        date.setDate(date.getDate() + 1);
      } else if (dateStr !== 'today' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(dateStr);
      }

      // Parse time
      const timeStr = flags.time as string;
      const timeMatch = timeStr.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);

      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3]?.toLowerCase();

        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        date.setHours(hours, minutes, 0, 0);
      } else {
        spinner.fail('Invalid time format. Use: 2pm, 14:00, 10:30am');
        return;
      }

      // Parse attendees
      const attendees = flags.invite
        ? (flags.invite as string).split(',').map(e => e.trim())
        : undefined;

      const event = await gmeet.scheduleMeeting({
        title,
        date,
        durationMinutes: flags.duration as number,
        attendees,
      });

      const meetLink = gmeet.getMeetLink(event);
      spinner.success('Meeting scheduled');

      if (globalFlags.json) {
        output.json({
          title: event.summary,
          link: meetLink,
          start: event.start.dateTime,
          end: event.end.dateTime,
          attendees: event.attendees?.map(a => a.email),
        });
        return;
      }

      console.log('');
      console.log(`  \x1b[1m${event.summary}\x1b[0m`);
      if (meetLink) {
        console.log(`  \x1b[36m${meetLink}\x1b[0m`);
      }

      const startDate = new Date(event.start.dateTime!);
      const endDate = new Date(event.end.dateTime!);
      console.log(`  \x1b[90m${startDate.toLocaleString()} - ${endDate.toLocaleTimeString()}\x1b[0m`);

      if (event.attendees && event.attendees.length > 0) {
        console.log(`  \x1b[90mInvited: ${event.attendees.map(a => a.email).join(', ')}\x1b[0m`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to schedule meeting');
      throw error;
    }
  },
};
