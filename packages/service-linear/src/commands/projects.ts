/**
 * uni linear projects - List Linear projects
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { linear, linearOAuth } from '../api';

export const projectsCommand: Command = {
  name: 'projects',
  aliases: ['project', 'p'],
  description: 'List projects',
  options: [
    { name: 'limit', short: 'n', type: 'number', description: 'Max results (default: 20)', default: 20 },
  ],
  examples: [
    'uni linear projects',
    'uni linear projects -n 10',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;
    const limit = (flags.limit as number) || 20;

    if (!linearOAuth.isAuthenticated()) {
      output.error('Not authenticated. Run "uni linear auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching projects...');

    try {
      const projects = await linear.listProjects(limit);
      spinner.success(`${projects.length} projects`);

      if (globalFlags.json) {
        output.json(projects);
        return;
      }

      if (projects.length === 0) {
        console.log(c.dim('\nNo projects found.'));
        return;
      }

      console.log('');
      for (const project of projects) {
        const progress = Math.round(project.progress * 100);
        const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
        const stateColor = project.state === 'started' ? c.green : project.state === 'planned' ? c.yellow : c.dim;

        console.log(`${c.bold(project.name)} ${stateColor(`[${project.state}]`)}`);
        console.log(c.dim(`  Progress: ${progressBar} ${progress}%`));
        if (project.lead) {
          console.log(c.dim(`  Lead: ${project.lead.name}`));
        }
        if (project.teams.nodes.length > 0) {
          console.log(c.dim(`  Teams: ${project.teams.nodes.map(t => t.name).join(', ')}`));
        }
        if (project.targetDate) {
          console.log(c.dim(`  Target: ${project.targetDate}`));
        }
        console.log(c.dim(`  ${project.url}`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch projects');
      throw error;
    }
  },
};
