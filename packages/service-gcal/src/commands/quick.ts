/**
 * uni gcal quick - Quick add event using natural language
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';

export const quickCommand: Command = {
  name: 'quick',
  aliases: ['q'],
  description: 'Quick add event using natural language',
  args: [
    { name: 'text', description: 'Natural language event description', required: true },
  ],
  options: [
    { name: 'calendar', short: 'c', type: 'string', description: 'Calendar ID (default: primary)' },
  ],
  examples: [
    'uni gcal quick "Lunch with John tomorrow at noon"',
    'uni gcal quick "Team meeting Friday 3pm-4pm"',
    'uni gcal quick "Dentist appointment next Monday 10am" --calendar work',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }

    const text = args.text as string;
    const calendarId = (flags.calendar as string) || 'primary';

    const spinner = output.spinner('Creating event...');
    try {
      const event = await gcal.quickAdd(text, calendarId);
      spinner.success(`Created: ${event.summary}`);

      if (globalFlags.json) {
        output.json(event);
        return;
      }

      const start = event.start.dateTime || event.start.date;
      output.info(`  When: ${start ? new Date(start).toLocaleString() : 'TBD'}`);
      if (event.location) output.info(`  Where: ${event.location}`);
      output.info(`  Link: ${event.htmlLink}`);
    } catch (error) {
      spinner.fail('Failed to create event');
      throw error;
    }
  },
};
