/**
 * uni gtasks undone - Mark task as not completed
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gtasks } from '../api';

export const undoneCommand: Command = {
  name: 'undone',
  description: 'Mark task as not completed',
  aliases: ['uncomplete', 'uncheck', 'reopen'],
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
  ],
  examples: [
    'uni gtasks undone "Buy groceries"',
    'uni gtasks undone abc123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const titleOrId = args.title as string;
    const listId = flags.list as string;
    const spinner = output.spinner('Reopening task...');

    try {
      // Try to find task by title first (include completed tasks)
      let task = await gtasks.findTaskByTitle(listId, titleOrId);

      if (!task) {
        spinner.fail(`Task "${titleOrId}" not found`);
        return;
      }

      if (task.status === 'needsAction') {
        spinner.success('Task is already open');
        return;
      }

      task = await gtasks.uncompleteTask(listId, task.id);
      spinner.success('Task reopened');

      if (globalFlags.json) {
        output.json(task);
        return;
      }

      console.log('');
      console.log(`  ○ ${c.bold(task.title)}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to reopen task');
      throw error;
    }
  },
};
