/**
 * uni gmeet list - List upcoming meetings
 */

import type { Command, CommandContext } from '@uni/shared';
import { timestamp, c } from '@uni/shared';
import { gmeet } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List upcoming meetings with Meet links',
  aliases: ['ls'],
  options: [
    {
      name: 'days',
      short: 'd',
      type: 'number',
      description: 'Days to look ahead',
      default: 7,
    },
  ],
  examples: [
    'uni gmeet list',
    'uni gmeet list --days 14',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const days = flags.days as number;
    const spinner = output.spinner(`Fetching meetings (next ${days} days)...`);

    try {
      const meetings = await gmeet.listMeetings(days);
      spinner.success(`Found ${meetings.length} meeting(s) with Meet links`);

      if (globalFlags.json) {
        output.json(meetings.map(m => ({
          title: m.summary,
          link: gmeet.getMeetLink(m),
          start: m.start.dateTime || m.start.date,
          end: m.end.dateTime || m.end.date,
        })));
        return;
      }

      if (meetings.length === 0) {
        output.info('No upcoming meetings with Meet links');
        return;
      }

      console.log('');

      // Group by date
      const byDate = new Map<string, typeof meetings>();
      for (const meeting of meetings) {
        const dateStr = (meeting.start.dateTime || meeting.start.date || '').split('T')[0];
        if (!byDate.has(dateStr)) {
          byDate.set(dateStr, []);
        }
        byDate.get(dateStr)!.push(meeting);
      }

      for (const [date, dayMeetings] of byDate) {
        const dateObj = new Date(date);
        const dateLabel = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
        console.log(c.bold(`📅 ${dateLabel}`));

        for (const meeting of dayMeetings) {
          const startTime = meeting.start.dateTime
            ? new Date(meeting.start.dateTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            : 'All day';

          const meetLink = gmeet.getMeetLink(meeting);

          console.log(`  ${c.cyan(startTime)} ${meeting.summary}`);
          if (meetLink) {
            console.log(`    ${c.dim(meetLink)}`);
          }
        }
        console.log('');
      }
      console.log(c.dim(timestamp()));
    } catch (error) {
      spinner.fail('Failed to fetch meetings');
      throw error;
    }
  },
};
