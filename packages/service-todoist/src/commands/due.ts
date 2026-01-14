/**
 * uni todoist due - View tasks by due date
 */

import type { Command, CommandContext } from '@uni/shared';
import { todoist, todoistOAuth } from '../api';

export const dueCommand: Command = {
  name: 'due',
  aliases: ['today', 'upcoming'],
  description: 'View tasks by due date filter',
  options: [
    { name: 'filter', short: 'f', type: 'string', description: 'Filter: today, tomorrow, week, overdue' },
    { name: 'project', short: 'p', type: 'string', description: 'Filter by project ID' },
  ],
  examples: [
    'uni todoist due',
    'uni todoist due --filter today',
    'uni todoist due --filter tomorrow',
    'uni todoist due --filter overdue',
    'uni todoist due --filter week --project PROJECT_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!todoistOAuth.isAuthenticated()) {
      output.error('Not authenticated. Run "uni todoist auth" first.');
      return;
    }

    const filterType = (flags.filter as string) || 'today';
    const projectId = flags.project as string | undefined;

    // Build Todoist filter string
    let filter: string;
    switch (filterType) {
      case 'today':
        filter = 'today';
        break;
      case 'tomorrow':
        filter = 'tomorrow';
        break;
      case 'week':
        filter = '7 days';
        break;
      case 'overdue':
        filter = 'overdue';
        break;
      default:
        filter = filterType;
    }

    const spinner = output.spinner(`Fetching ${filterType} tasks...`);

    try {
      const tasks = await todoist.listTasks({ projectId, filter });
      spinner.stop();

      if (globalFlags.json) {
        output.json(tasks);
        return;
      }

      if (tasks.length === 0) {
        output.info(`No ${filterType} tasks found.`);
        return;
      }

      output.info(`${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Tasks (${tasks.length}):\n`);
      for (const task of tasks) {
        const priority = task.priority > 1 ? ` [P${5 - task.priority}]` : '';
        const due = task.due ? ` - ${task.due.string}` : '';
        output.info(`  [ ] ${task.content}${priority}${due}`);
        output.info(`      ID: ${task.id}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch tasks');
      throw error;
    }
  },
};
