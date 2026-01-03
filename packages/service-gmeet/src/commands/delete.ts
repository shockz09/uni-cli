/**
 * uni gmeet delete - Cancel/delete a scheduled meeting
 */

import type { Command, CommandContext } from '@uni/shared';
import { timestamp } from '@uni/shared';
import { gmeet } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Cancel/delete a scheduled meeting',
  aliases: ['cancel', 'remove', 'rm'],
  args: [
    {
      name: 'search',
      required: true,
      description: 'Meeting name to search for',
    },
  ],
  options: [
    {
      name: 'days',
      short: 'd',
      type: 'number',
      description: 'Days to search ahead',
      default: 14,
    },
  ],
  examples: [
    'uni gmeet delete "Team Sync"',
    'uni gmeet cancel "1:1 with John"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const search = args.search as string;
    const days = (flags.days as number) || 14;

    const meetings = await gmeet.listMeetings(days);

    // Find matching meeting
    const meeting = meetings.find(
      m => m.id === search || m.summary?.toLowerCase().includes(search.toLowerCase())
    );

    if (!meeting) {
      output.error(`No meeting found matching "${search}" in the next ${days} days`);
      return;
    }

    await gmeet.deleteMeeting(meeting.id);

    if (globalFlags.json) {
      output.json({
        id: meeting.id,
        title: meeting.summary,
        deleted: true,
      });
      return;
    }

    output.success(`Cancelled meeting: ${meeting.summary}`);
    console.log(`\x1b[90m${timestamp()}\x1b[0m`);
  },
};
