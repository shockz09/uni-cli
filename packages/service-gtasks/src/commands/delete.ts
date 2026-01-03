/**
 * uni gtasks delete - Delete a task
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gtasks } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a task',
  aliases: ['rm', 'remove'],
  args: [
    {
      name: 'title',
      description: 'Task title or ID',
      required: true,
    },
  ],
  options: [
    {
      name: 'list',
      short: 'l',
      type: 'string',
      description: 'Task list ID',
      default: '@default',
    },
    {
      name: 'force',
      short: 'f',
      type: 'boolean',
      description: 'Skip confirmation',
      default: false,
    },
  ],
  examples: [
    'uni gtasks delete "Old task"',
    'uni gtasks delete abc123 --force',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const titleOrId = args.title as string;
    const listId = flags.list as string;
    const spinner = output.spinner('Finding task...');

    try {
      const task = await gtasks.findTaskByTitle(listId, titleOrId);

      if (!task) {
        spinner.fail(`Task "${titleOrId}" not found`);
        return;
      }

      spinner.success(`Found: ${task.title}`);

      // Confirm unless --force
      if (!flags.force) {
        const readline = await import('node:readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(c.yellow(`Delete "${task.title}"? [y/N] `), resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'y') {
          output.info('Cancelled');
          return;
        }
      }

      const deleteSpinner = output.spinner('Deleting...');
      await gtasks.deleteTask(listId, task.id);
      deleteSpinner.success('Task deleted');

      if (globalFlags.json) {
        output.json({ deleted: task.id, title: task.title });
      }
    } catch (error) {
      spinner.fail('Failed to delete task');
      throw error;
    }
  },
};
