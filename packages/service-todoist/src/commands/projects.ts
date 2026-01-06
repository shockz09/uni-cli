/**
 * uni todoist projects - Manage Todoist projects
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { todoist, todoistOAuth } from '../api';

export const projectsCommand: Command = {
  name: 'projects',
  aliases: ['project', 'p'],
  description: 'Manage projects',
  subcommands: [
    {
      name: 'list',
      aliases: ['ls'],
      description: 'List projects',
      examples: ['uni todoist projects list'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, globalFlags } = ctx;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const spinner = output.spinner('Fetching projects...');

        try {
          const projects = await todoist.listProjects();
          spinner.success(`${projects.length} projects`);

          if (globalFlags.json) {
            output.json(projects);
            return;
          }

          console.log('');
          for (const project of projects) {
            const inbox = project.is_inbox_project ? c.dim(' (Inbox)') : '';
            const favorite = project.is_favorite ? c.yellow(' ★') : '';
            const shared = project.is_shared ? c.cyan(' [shared]') : '';

            console.log(`${c.bold(project.name)}${inbox}${favorite}${shared}  ${c.dim(`[${project.id}]`)}`);
            console.log(c.dim(`  ${project.comment_count} comments | ${project.view_style} view`));
            console.log('');
          }
        } catch (error) {
          spinner.fail('Failed to fetch projects');
          throw error;
        }
      },
    },
    {
      name: 'create',
      aliases: ['new', 'add'],
      description: 'Create a project',
      args: [{ name: 'name', description: 'Project name', required: true }],
      options: [
        { name: 'favorite', short: 'f', type: 'boolean', description: 'Mark as favorite' },
        { name: 'view', short: 'v', type: 'string', description: 'View style: list or board' },
      ],
      examples: [
        'uni todoist projects create "Work"',
        'uni todoist projects create "Side Project" --favorite',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, flags, globalFlags } = ctx;
        const name = args.name as string;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const spinner = output.spinner('Creating project...');

        try {
          const project = await todoist.createProject({
            name,
            is_favorite: flags.favorite as boolean | undefined,
            view_style: flags.view as 'list' | 'board' | undefined,
          });

          spinner.success('Project created');

          if (globalFlags.json) {
            output.json(project);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Created: ${project.name}  ${c.dim(`[${project.id}]`)}`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to create project');
          throw error;
        }
      },
    },
    {
      name: 'delete',
      aliases: ['rm', 'remove'],
      description: 'Delete a project',
      args: [{ name: 'name', description: 'Project name or ID', required: true }],
      examples: ['uni todoist projects delete "Old Project"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const name = args.name as string;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const spinner = output.spinner('Deleting project...');

        try {
          // Try to find by name first, then use input as ID
          const projects = await todoist.listProjects();
          const project = projects.find(p =>
            p.name.toLowerCase() === name.toLowerCase() || p.id === name
          );

          if (!project) {
            spinner.fail(`Project "${name}" not found`);
            return;
          }

          await todoist.deleteProject(project.id);
          spinner.success('Project deleted');

          if (globalFlags.json) {
            output.json({ success: true, projectId: project.id });
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Deleted project`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to delete project');
          throw error;
        }
      },
    },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const listCmd = this.subcommands?.find(s => s.name === 'list');
    if (listCmd) {
      await listCmd.handler(ctx);
    }
  },
};
