/**
 * uni gcal remind - Set event reminders
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';

export const remindCommand: Command = {
  name: 'remind',
  aliases: ['reminder'],
  description: 'Set reminders for an event',
  args: [
    { name: 'eventId', description: 'Event ID', required: true },
  ],
  options: [
    { name: 'popup', short: 'p', type: 'string', description: 'Popup reminder minutes before (comma-separated)' },
    { name: 'email', short: 'e', type: 'string', description: 'Email reminder minutes before (comma-separated)' },
    { name: 'calendar', short: 'c', type: 'string', description: 'Calendar ID (default: primary)' },
  ],
  examples: [
    'uni gcal remind EVENT_ID --popup 10',
    'uni gcal remind EVENT_ID --popup 10,30 --email 60',
    'uni gcal remind EVENT_ID --popup "5,15,30" --email "60,1440"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }

    const eventId = args.eventId as string;
    const calendarId = (flags.calendar as string) || 'primary';

    if (!flags.popup && !flags.email) {
      output.error('Specify at least one reminder: --popup or --email');
      return;
    }

    const reminders: Array<{ method: 'email' | 'popup'; minutes: number }> = [];

    if (flags.popup) {
      const minutes = (flags.popup as string).split(',').map(m => parseInt(m.trim(), 10));
      for (const min of minutes) {
        if (!isNaN(min)) reminders.push({ method: 'popup', minutes: min });
      }
    }

    if (flags.email) {
      const minutes = (flags.email as string).split(',').map(m => parseInt(m.trim(), 10));
      for (const min of minutes) {
        if (!isNaN(min)) reminders.push({ method: 'email', minutes: min });
      }
    }

    if (reminders.length === 0) {
      output.error('No valid reminder times provided');
      return;
    }

    const spinner = output.spinner('Setting reminders...');
    try {
      const event = await gcal.setReminders(eventId, reminders, calendarId);
      spinner.success(`Set ${reminders.length} reminder(s) for: ${event.summary}`);

      if (globalFlags.json) {
        output.json({ reminders, event });
        return;
      }

      output.info('\nReminders set:');
      for (const r of reminders) {
        output.info(`  - ${r.method}: ${r.minutes} minutes before`);
      }
    } catch (error) {
      spinner.fail('Failed to set reminders');
      throw error;
    }
  },
};
