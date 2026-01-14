/**
 * uni gmeet update - Update meeting details
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmeet } from '../api';

export const updateCommand: Command = {
  name: 'update',
  aliases: ['edit'],
  description: 'Update meeting title or time',
  args: [
    { name: 'eventId', description: 'Meeting/event ID', required: true },
  ],
  options: [
    { name: 'title', short: 't', type: 'string', description: 'New title' },
    { name: 'date', short: 'd', type: 'string', description: 'New date/time (ISO format)' },
    { name: 'duration', type: 'string', description: 'Duration in minutes' },
  ],
  examples: [
    'uni gmeet update EVENT_ID --title "Updated Meeting"',
    'uni gmeet update EVENT_ID --date "2024-01-20T15:00:00"',
    'uni gmeet update EVENT_ID --date "2024-01-20T15:00:00" --duration 60',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const eventId = args.eventId as string;

    if (!flags.title && !flags.date) {
      output.error('Specify --title or --date');
      return;
    }

    const updates: { title?: string; date?: Date; durationMinutes?: number } = {};
    if (flags.title) updates.title = flags.title as string;
    if (flags.date) updates.date = new Date(flags.date as string);
    if (flags.duration) updates.durationMinutes = parseInt(flags.duration as string, 10);

    const spinner = output.spinner('Updating meeting...');
    try {
      const meeting = await gmeet.updateMeeting(eventId, updates);
      spinner.success(`Updated: ${meeting.summary}`);

      if (globalFlags.json) {
        output.json(meeting);
      }
    } catch (error) {
      spinner.fail('Failed to update meeting');
      throw error;
    }
  },
};
