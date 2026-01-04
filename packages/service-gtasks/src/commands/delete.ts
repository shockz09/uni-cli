/**
 * uni gtasks delete - Delete a task
 */

import type { Command, CommandContext } from '@uni/shared';
import { gtasks } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a task',
  aliases: ['rm', 'remove'],
  args: [
    {
      name: 'query',
      description: 'Task title, ID, or index (1-based)',
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
    'uni gtasks delete "Old task"',
    'uni gtasks delete 1',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const query = args.query as string;
    const listId = flags.list as string;

    let task;

    // Check if query is a number (index)
    const index = parseInt(query, 10);
    if (!isNaN(index) && index > 0 && String(index) === query) {
      // It's an index - get tasks and find by position
      const tasks = await gtasks.getTasks(listId, { showCompleted: false });
      if (index > tasks.length) {
        output.error(`No task at index ${index}. Only ${tasks.length} tasks.`);
        return;
      }
      task = tasks[index - 1]; // 1-based index
    } else {
      // Search by title
      task = await gtasks.findTaskByTitle(listId, query);
    }

    if (!task) {
      output.error(`Task "${query}" not found`);
      return;
    }

    await gtasks.deleteTask(listId, task.id);

    if (globalFlags.json) {
      output.json({ deleted: task.id, title: task.title });
      return;
    }

    output.success(`Deleted: ${task.title}`);
  },
};
