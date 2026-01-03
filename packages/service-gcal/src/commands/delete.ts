/**
 * uni gcal delete - Delete a calendar event
 */

import type { Command, CommandContext } from '@uni/shared';
import { timestamp, c } from '@uni/shared';
import { gcal } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a calendar event',
  aliases: ['remove', 'rm', 'cancel'],
  args: [
    {
      name: 'search',
      required: true,
      description: 'Event name/ID to search for',
    },
  ],
  examples: [
    'uni gcal delete "Team Meeting"',
    'uni gcal delete "Check-in"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const search = args.search as string;

    // Search for event in next 14 days
    const now = new Date();
    const searchEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const events = await gcal.listEvents({
      timeMin: now,
      timeMax: searchEnd,
      maxResults: 50,
    });

    // Find matching event (by ID or title substring)
    const event = events.find(
      e => e.id === search || e.summary?.toLowerCase().includes(search.toLowerCase())
    );

    if (!event) {
      output.error(`No event found matching "${search}" in the next 14 days`);
      return;
    }

    await gcal.deleteEvent(event.id);

    if (globalFlags.json) {
      output.json({
        id: event.id,
        title: event.summary,
        deleted: true,
      });
      return;
    }

    output.success(`Deleted event: ${event.summary}`);
    console.log(c.dim(timestamp()));
  },
};
