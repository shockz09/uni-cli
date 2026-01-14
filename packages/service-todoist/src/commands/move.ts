/**
 * uni todoist move - Update task priority and labels
 */

import type { Command, CommandContext } from '@uni/shared';
import { todoist, todoistOAuth } from '../api';

export const moveCommand: Command = {
  name: 'priority',
  aliases: ['prio', 'p'],
  description: 'Update task priority',
  args: [
    { name: 'taskId', description: 'Task ID', required: true },
    { name: 'priority', description: 'Priority level (1-4, where 1 is highest)', required: true },
  ],
  examples: [
    'uni todoist priority TASK_ID 1',
    'uni todoist priority TASK_ID 4',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!todoistOAuth.isAuthenticated()) {
      output.error('Not authenticated. Run "uni todoist auth" first.');
      return;
    }

    const taskId = args.taskId as string;
    const priority = parseInt(args.priority as string, 10);

    if (priority < 1 || priority > 4) {
      output.error('Priority must be between 1 (highest) and 4 (lowest)');
      return;
    }

    const spinner = output.spinner('Updating priority...');

    try {
      // Todoist uses inverse priority (4 = p1, 1 = p4)
      const task = await todoist.updateTask(taskId, { priority: 5 - priority });
      spinner.success(`Updated priority to P${priority}: ${task.content}`);

      if (globalFlags.json) {
        output.json(task);
      }
    } catch (error) {
      spinner.fail('Failed to update priority');
      throw error;
    }
  },
};
