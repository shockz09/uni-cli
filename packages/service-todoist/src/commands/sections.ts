/**
 * uni todoist sections - Manage sections within projects
 */

import type { Command, CommandContext } from '@uni/shared';
import { todoist, todoistOAuth } from '../api';

export const sectionsCommand: Command = {
  name: 'sections',
  aliases: ['section', 'sec'],
  description: 'List and manage sections within projects',
  subcommands: [
    {
      name: 'list',
      aliases: ['ls'],
      description: 'List sections',
      options: [
        { name: 'project', short: 'p', type: 'string', description: 'Filter by project ID' },
      ],
      examples: [
        'uni todoist sections list',
        'uni todoist sections list --project PROJECT_ID',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, flags, globalFlags } = ctx;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const projectId = flags.project as string | undefined;
        const spinner = output.spinner('Fetching sections...');

        try {
          const sections = await todoist.listSections(projectId);
          spinner.stop();

          if (globalFlags.json) {
            output.json(sections);
            return;
          }

          if (sections.length === 0) {
            output.info('No sections found.');
            return;
          }

          output.info(`Sections (${sections.length}):\n`);
          for (const section of sections) {
            output.info(`  ${section.name}`);
            output.info(`    ID: ${section.id} | Project: ${section.project_id}`);
          }
        } catch (error) {
          spinner.fail('Failed to fetch sections');
          throw error;
        }
      },
    },
    {
      name: 'create',
      aliases: ['new', 'add'],
      description: 'Create a section',
      args: [
        { name: 'name', description: 'Section name', required: true },
      ],
      options: [
        { name: 'project', short: 'p', type: 'string', description: 'Project ID', required: true },
      ],
      examples: [
        'uni todoist sections create "In Progress" --project PROJECT_ID',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, flags, globalFlags } = ctx;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const name = args.name as string;
        const projectId = flags.project as string;

        if (!projectId) {
          output.error('--project is required');
          return;
        }

        const spinner = output.spinner('Creating section...');
        try {
          const section = await todoist.createSection({ project_id: projectId, name });
          spinner.success(`Created: ${section.name}`);

          if (globalFlags.json) {
            output.json(section);
          } else {
            output.info(`  ID: ${section.id}`);
          }
        } catch (error) {
          spinner.fail('Failed to create section');
          throw error;
        }
      },
    },
    {
      name: 'delete',
      aliases: ['rm', 'remove'],
      description: 'Delete a section',
      args: [
        { name: 'id', description: 'Section ID', required: true },
      ],
      examples: [
        'uni todoist sections delete SECTION_ID',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const sectionId = args.id as string;
        const spinner = output.spinner('Deleting section...');

        try {
          await todoist.deleteSection(sectionId);
          spinner.success('Section deleted');

          if (globalFlags.json) {
            output.json({ deleted: true, id: sectionId });
          }
        } catch (error) {
          spinner.fail('Failed to delete section');
          throw error;
        }
      },
    },
  ],
  examples: [
    'uni todoist sections list',
    'uni todoist sections create "In Progress" --project PROJECT_ID',
    'uni todoist sections delete SECTION_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    ctx.output.error('Please use a subcommand: list, create, delete');
  },
};
