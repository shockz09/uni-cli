/**
 * uni todoist quick - Quick add task with natural language
 */

import type { Command, CommandContext } from '@uni/shared';
import { todoist, todoistOAuth } from '../api';

export const quickCommand: Command = {
  name: 'quick',
  aliases: ['q', 'add-quick'],
  description: 'Quick add a task using natural language',
  args: [
    { name: 'text', description: 'Task with natural language due date', required: true },
  ],
  examples: [
    'uni todoist quick "Buy milk tomorrow"',
    'uni todoist quick "Call mom every monday at 10am"',
    'uni todoist quick "Submit report friday #work @urgent"',
    'uni todoist quick "Meeting next wednesday at 2pm"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!todoistOAuth.isAuthenticated()) {
      output.error('Not authenticated. Run "uni todoist auth" first.');
      return;
    }

    const text = args.text as string;
    const spinner = output.spinner('Adding task...');

    try {
      const task = await todoist.quickAddTask(text);
      spinner.success(`Added: ${task.content}`);

      if (globalFlags.json) {
        output.json(task);
        return;
      }

      output.info(`  ID: ${task.id}`);
      if (task.due) {
        output.info(`  Due: ${task.due.string}`);
      }
      if (task.labels.length > 0) {
        output.info(`  Labels: ${task.labels.join(', ')}`);
      }
      output.info(`  URL: ${task.url}`);
    } catch (error) {
      spinner.fail('Failed to add task');
      throw error;
    }
  },
};
