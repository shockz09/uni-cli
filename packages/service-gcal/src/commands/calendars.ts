/**
 * uni gcal calendars - List and manage calendars
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';

export const calendarsCommand: Command = {
  name: 'calendars',
  aliases: ['cals'],
  description: 'List all calendars',
  options: [
    { name: 'create', short: 'c', type: 'string', description: 'Create a new calendar with this name' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete calendar by ID' },
    { name: 'description', type: 'string', description: 'Description for new calendar' },
  ],
  examples: [
    'uni gcal calendars',
    'uni gcal calendars --create "Work"',
    'uni gcal calendars --create "Personal" --description "My personal events"',
    'uni gcal calendars --delete CALENDAR_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }

    // Create calendar
    if (flags.create) {
      const spinner = output.spinner('Creating calendar...');
      try {
        const calendar = await gcal.createCalendar(flags.create as string, {
          description: flags.description as string | undefined,
        });
        spinner.success(`Created calendar: ${calendar.summary}`);
        if (globalFlags.json) {
          output.json(calendar);
        } else {
          output.log(`ID: ${calendar.id}`);
        }
        return;
      } catch (error) {
        spinner.fail('Failed to create calendar');
        throw error;
      }
    }

    // Delete calendar
    if (flags.delete) {
      const spinner = output.spinner('Deleting calendar...');
      try {
        await gcal.deleteCalendar(flags.delete as string);
        spinner.success('Calendar deleted');
        return;
      } catch (error) {
        spinner.fail('Failed to delete calendar');
        throw error;
      }
    }

    // List calendars
    const spinner = output.spinner('Fetching calendars...');
    try {
      const calendars = await gcal.listCalendars();
      spinner.stop();

      if (globalFlags.json) {
        output.json(calendars);
        return;
      }

      if (calendars.length === 0) {
        output.log('No calendars found.');
        return;
      }

      output.log(`Found ${calendars.length} calendars:\n`);
      for (const cal of calendars) {
        const primary = cal.primary ? ' (primary)' : '';
        const role = cal.accessRole ? ` [${cal.accessRole}]` : '';
        output.log(`  ${cal.summary}${primary}${role}`);
        output.log(`    ID: ${cal.id}`);
        if (cal.description) output.log(`    ${cal.description}`);
        output.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch calendars');
      throw error;
    }
  },
};
