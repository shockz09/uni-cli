/**
 * uni linear cycles - Manage cycles/sprints
 */

import type { Command, CommandContext } from '@uni/shared';
import { linear, linearOAuth } from '../api';

export const cyclesCommand: Command = {
  name: 'cycles',
  aliases: ['cycle', 'sprint', 'sprints'],
  description: 'List and view cycles/sprints',
  options: [
    { name: 'team', short: 't', type: 'string', description: 'Filter by team ID' },
    { name: 'current', short: 'c', type: 'boolean', description: 'Show current active cycle only' },
    { name: 'limit', short: 'n', type: 'string', description: 'Number of cycles (default: 10)' },
  ],
  examples: [
    'uni linear cycles',
    'uni linear cycles --team TEAM_ID',
    'uni linear cycles --current --team TEAM_ID',
    'uni linear cycles --limit 5',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!linearOAuth.isAuthenticated()) {
      output.error('Not authenticated. Run "uni linear auth" first.');
      return;
    }

    const teamId = flags.team as string | undefined;
    const showCurrent = flags.current as boolean;

    // Show current cycle
    if (showCurrent) {
      if (!teamId) {
        output.error('--team is required when using --current');
        return;
      }

      const spinner = output.spinner('Fetching current cycle...');
      try {
        const cycle = await linear.getCurrentCycle(teamId);
        spinner.stop();

        if (!cycle) {
          output.info('No active cycle found for this team.');
          return;
        }

        if (globalFlags.json) {
          output.json(cycle);
          return;
        }

        const start = new Date(cycle.startsAt).toLocaleDateString();
        const end = new Date(cycle.endsAt).toLocaleDateString();
        const progress = Math.round(cycle.progress * 100);

        output.info(`Current Cycle: ${cycle.name || `Cycle ${cycle.number}`}`);
        output.info(`  Team: ${cycle.team.name} (${cycle.team.key})`);
        output.info(`  Period: ${start} - ${end}`);
        output.info(`  Progress: ${progress}%`);
        return;
      } catch (error) {
        spinner.fail('Failed to fetch current cycle');
        throw error;
      }
    }

    // List cycles
    const limit = parseInt((flags.limit as string) || '10', 10);
    const spinner = output.spinner('Fetching cycles...');

    try {
      const cycles = await linear.listCycles(teamId, limit);
      spinner.stop();

      if (globalFlags.json) {
        output.json(cycles);
        return;
      }

      if (cycles.length === 0) {
        output.info('No cycles found.');
        return;
      }

      output.info(`Cycles (${cycles.length}):\n`);
      for (const cycle of cycles) {
        const start = new Date(cycle.startsAt).toLocaleDateString();
        const end = new Date(cycle.endsAt).toLocaleDateString();
        const progress = Math.round(cycle.progress * 100);
        const name = cycle.name || `Cycle ${cycle.number}`;

        output.info(`  ${name} [${cycle.team.key}]`);
        output.info(`    ${start} - ${end} | ${progress}% complete`);
        output.info(`    ID: ${cycle.id}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch cycles');
      throw error;
    }
  },
};
