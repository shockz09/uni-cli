/**
 * uni gtasks done - Mark task as completed
 */

import type { Command, CommandContext } from '@uni/shared';
import { gtasks } from '../api';

export const doneCommand: Command = {
  name: 'done',
  description: 'Mark task as completed',
  aliases: ['complete', 'check'],
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
    'uni gtasks done "Buy groceries"',
    'uni gtasks done abc123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const titleOrId = args.title as string;
    const listId = flags.list as string;
    const spinner = output.spinner('Completing task...');

    try {
      // Try to find task by title first
      let task = await gtasks.findTaskByTitle(listId, titleOrId);

      if (!task) {
        spinner.fail(`Task "${titleOrId}" not found`);
        return;
      }

      if (task.status === 'completed') {
        spinner.success('Task already completed');
        return;
      }

      task = await gtasks.completeTask(listId, task.id);
      spinner.success('Task completed');

      if (globalFlags.json) {
        output.json(task);
        return;
      }

      console.log('');
      console.log(`  \x1b[32m✓\x1b[0m \x1b[90m\x1b[9m${task.title}\x1b[0m`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to complete task');
      throw error;
    }
  },
};
