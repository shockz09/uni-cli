/**
 * uni gtasks move - Move/reorder a task
 */

import type { Command, CommandContext } from '@uni/shared';
import { gtasks } from '../api';

export const moveCommand: Command = {
  name: 'move',
  description: 'Move or reorder a task',
  args: [
    { name: 'taskId', description: 'Task ID to move', required: true },
  ],
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID (default: @default)' },
    { name: 'parent', short: 'p', type: 'string', description: 'Parent task ID (makes it a subtask)' },
    { name: 'after', short: 'a', type: 'string', description: 'Task ID to position after' },
  ],
  examples: [
    'uni gtasks move TASK_ID --parent PARENT_TASK_ID',
    'uni gtasks move TASK_ID --after OTHER_TASK_ID',
    'uni gtasks move TASK_ID --list LIST_ID --parent PARENT_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const taskId = args.taskId as string;
    const listId = (flags.list as string) || '@default';

    const spinner = output.spinner('Moving task...');
    try {
      const task = await gtasks.moveTask(listId, taskId, {
        parent: flags.parent as string | undefined,
        previous: flags.after as string | undefined,
      });
      spinner.success(`Moved: ${task.title}`);

      if (globalFlags.json) {
        output.json(task);
      }
    } catch (error) {
      spinner.fail('Failed to move task');
      throw error;
    }
  },
};
