/**
 * uni gtasks get - Get task details
 */

import type { Command, CommandContext } from '@uni/shared';
import { gtasks } from '../api';

export const getCommand: Command = {
  name: 'get',
  aliases: ['view', 'show'],
  description: 'Get task details',
  args: [
    { name: 'taskId', description: 'Task ID', required: true },
  ],
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID (default: @default)' },
  ],
  examples: [
    'uni gtasks get TASK_ID',
    'uni gtasks get TASK_ID --list LIST_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const taskId = args.taskId as string;
    const listId = (flags.list as string) || '@default';

    const spinner = output.spinner('Fetching task...');
    try {
      const task = await gtasks.getTask(listId, taskId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(task);
        return;
      }

      const status = task.status === 'completed' ? '[x]' : '[ ]';
      output.info(`${status} ${task.title}\n`);
      output.info(`  ID: ${task.id}`);
      output.info(`  Status: ${task.status}`);
      if (task.notes) output.info(`  Notes: ${task.notes}`);
      if (task.due) output.info(`  Due: ${new Date(task.due).toLocaleDateString()}`);
      if (task.completed) output.info(`  Completed: ${new Date(task.completed).toLocaleString()}`);
      if (task.parent) output.info(`  Parent: ${task.parent}`);
      if (task.updated) output.info(`  Updated: ${new Date(task.updated).toLocaleString()}`);
    } catch (error) {
      spinner.fail('Failed to fetch task');
      throw error;
    }
  },
};
