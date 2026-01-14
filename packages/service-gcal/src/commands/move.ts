/**
 * uni gcal move - Move event to another calendar
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';

export const moveCommand: Command = {
  name: 'move',
  description: 'Move event to another calendar',
  args: [
    { name: 'eventId', description: 'Event ID', required: true },
    { name: 'toCalendar', description: 'Destination calendar ID', required: true },
  ],
  options: [
    { name: 'from', short: 'f', type: 'string', description: 'Source calendar ID (default: primary)' },
  ],
  examples: [
    'uni gcal move EVENT_ID work@group.calendar.google.com',
    'uni gcal move EVENT_ID personal --from work',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }

    const eventId = args.eventId as string;
    const toCalendar = args.toCalendar as string;
    const fromCalendar = (flags.from as string) || 'primary';

    const spinner = output.spinner('Moving event...');
    try {
      const event = await gcal.moveEvent(eventId, fromCalendar, toCalendar);
      spinner.success(`Moved: ${event.summary}`);

      if (globalFlags.json) {
        output.json(event);
      }
    } catch (error) {
      spinner.fail('Failed to move event');
      throw error;
    }
  },
};
