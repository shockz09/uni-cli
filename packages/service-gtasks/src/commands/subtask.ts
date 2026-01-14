/**
 * uni gtasks subtask - Add a subtask
 */

import type { Command, CommandContext } from '@uni/shared';
import { gtasks } from '../api';

export const subtaskCommand: Command = {
  name: 'subtask',
  description: 'Add a subtask under a parent task',
  args: [
    { name: 'parentId', description: 'Parent task ID', required: true },
    { name: 'title', description: 'Subtask title', required: true },
  ],
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID (default: @default)' },
    { name: 'notes', short: 'n', type: 'string', description: 'Task notes' },
    { name: 'due', short: 'd', type: 'string', description: 'Due date (YYYY-MM-DD)' },
  ],
  examples: [
    'uni gtasks subtask PARENT_ID "Subtask title"',
    'uni gtasks subtask PARENT_ID "Subtask" --notes "Details here"',
    'uni gtasks subtask PARENT_ID "Subtask" --due 2024-01-20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const parentId = args.parentId as string;
    const title = args.title as string;
    const listId = (flags.list as string) || '@default';

    const spinner = output.spinner('Creating subtask...');
    try {
      // Create the task
      const task = await gtasks.createTask(listId, {
        title,
        notes: flags.notes as string | undefined,
        due: flags.due ? new Date(flags.due as string).toISOString() : undefined,
      });

      // Move it under the parent
      const movedTask = await gtasks.moveTask(listId, task.id, { parent: parentId });
      spinner.success(`Created subtask: ${movedTask.title}`);

      if (globalFlags.json) {
        output.json(movedTask);
      } else {
        output.info(`  ID: ${movedTask.id}`);
        output.info(`  Parent: ${parentId}`);
      }
    } catch (error) {
      spinner.fail('Failed to create subtask');
      throw error;
    }
  },
};
