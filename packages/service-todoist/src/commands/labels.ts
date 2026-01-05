/**
 * uni todoist labels - Manage Todoist labels
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { todoist, todoistOAuth } from '../api';

export const labelsCommand: Command = {
  name: 'labels',
  aliases: ['label', 'l'],
  description: 'Manage labels',
  subcommands: [
    {
      name: 'list',
      aliases: ['ls'],
      description: 'List labels',
      examples: ['uni todoist labels list'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, globalFlags } = ctx;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const spinner = output.spinner('Fetching labels...');

        try {
          const labels = await todoist.listLabels();
          spinner.success(`${labels.length} labels`);

          if (globalFlags.json) {
            output.json(labels);
            return;
          }

          if (labels.length === 0) {
            console.log(c.dim('\nNo labels found.'));
            return;
          }

          console.log('');
          for (const label of labels) {
            const favorite = label.is_favorite ? c.yellow(' ★') : '';
            console.log(`${c.magenta('@' + label.name)}${favorite}`);
          }
          console.log('');
        } catch (error) {
          spinner.fail('Failed to fetch labels');
          throw error;
        }
      },
    },
    {
      name: 'create',
      aliases: ['new', 'add'],
      description: 'Create a label',
      args: [{ name: 'name', description: 'Label name', required: true }],
      options: [
        { name: 'favorite', short: 'f', type: 'boolean', description: 'Mark as favorite' },
      ],
      examples: [
        'uni todoist labels create "urgent"',
        'uni todoist labels create "work" --favorite',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, flags, globalFlags } = ctx;
        const name = args.name as string;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const spinner = output.spinner('Creating label...');

        try {
          const label = await todoist.createLabel({
            name,
            is_favorite: flags.favorite as boolean | undefined,
          });

          spinner.success('Label created');

          if (globalFlags.json) {
            output.json(label);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Created: @${label.name}`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to create label');
          throw error;
        }
      },
    },
    {
      name: 'delete',
      aliases: ['rm', 'remove'],
      description: 'Delete a label',
      args: [{ name: 'name', description: 'Label name or ID', required: true }],
      examples: ['uni todoist labels delete "old-label"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const name = args.name as string;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const spinner = output.spinner('Deleting label...');

        try {
          let labelId = name;

          if (!/^\d+$/.test(name)) {
            const labels = await todoist.listLabels();
            const label = labels.find(l => l.name.toLowerCase() === name.toLowerCase());
            if (!label) {
              spinner.fail(`Label "${name}" not found`);
              return;
            }
            labelId = label.id;
          }

          await todoist.deleteLabel(labelId);
          spinner.success('Label deleted');

          if (globalFlags.json) {
            output.json({ success: true, labelId });
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Deleted label`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to delete label');
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
