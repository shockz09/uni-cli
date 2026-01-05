/**
 * uni linear teams - List Linear teams
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { linear } from '../api';

export const teamsCommand: Command = {
  name: 'teams',
  aliases: ['team', 't'],
  description: 'List teams',
  examples: ['uni linear teams'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, globalFlags } = ctx;

    if (!linear.hasToken()) {
      output.error('LINEAR_API_KEY not set. Get your key from https://linear.app/settings/api');
      return;
    }

    const spinner = output.spinner('Fetching teams...');

    try {
      const teams = await linear.listTeams();
      spinner.success(`${teams.length} teams`);

      if (globalFlags.json) {
        output.json(teams);
        return;
      }

      if (teams.length === 0) {
        console.log(c.dim('\nNo teams found.'));
        return;
      }

      console.log('');
      for (const team of teams) {
        console.log(`${c.cyan(team.key)} ${c.bold(team.name)}`);
        if (team.description) {
          console.log(c.dim(`  ${team.description}`));
        }
        console.log(c.dim(`  ${team.issueCount} issues`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch teams');
      throw error;
    }
  },
};
