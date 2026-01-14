/**
 * uni gcal freebusy - Check free/busy times
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';

export const freebusyCommand: Command = {
  name: 'freebusy',
  aliases: ['fb', 'busy'],
  description: 'Check free/busy times',
  options: [
    { name: 'days', short: 'd', type: 'string', description: 'Number of days to check (default: 1)' },
    { name: 'calendar', short: 'c', type: 'string', description: 'Calendar ID (default: primary)' },
    { name: 'start', short: 's', type: 'string', description: 'Start date (YYYY-MM-DD, default: today)' },
  ],
  examples: [
    'uni gcal freebusy',
    'uni gcal freebusy --days 7',
    'uni gcal freebusy --start 2024-01-15 --days 3',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }

    const days = parseInt((flags.days as string) || '1', 10);
    const calendarId = (flags.calendar as string) || 'primary';

    let timeMin: Date;
    if (flags.start) {
      timeMin = new Date(flags.start as string);
      timeMin.setHours(0, 0, 0, 0);
    } else {
      timeMin = new Date();
      timeMin.setHours(0, 0, 0, 0);
    }

    const timeMax = new Date(timeMin.getTime() + days * 24 * 60 * 60 * 1000);

    const spinner = output.spinner('Checking availability...');
    try {
      const response = await gcal.getFreeBusy(timeMin, timeMax, [calendarId]);
      spinner.stop();

      const calendarBusy = response.calendars[calendarId];

      if (globalFlags.json) {
        output.json({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), busy: calendarBusy?.busy || [] });
        return;
      }

      output.log(`Free/Busy: ${timeMin.toLocaleDateString()} - ${timeMax.toLocaleDateString()}\n`);

      if (!calendarBusy?.busy || calendarBusy.busy.length === 0) {
        output.log('  No busy times found - you\'re free!');
        return;
      }

      output.log('Busy times:');
      for (const busy of calendarBusy.busy) {
        const start = new Date(busy.start);
        const end = new Date(busy.end);
        output.log(`  ${start.toLocaleString()} - ${end.toLocaleTimeString()}`);
      }
    } catch (error) {
      spinner.fail('Failed to check availability');
      throw error;
    }
  },
};
