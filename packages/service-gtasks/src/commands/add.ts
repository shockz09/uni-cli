/**
 * uni gtasks add - Add a task
 */

import type { Command, CommandContext } from '@uni/shared';
import { gtasks } from '../api';

export const addCommand: Command = {
  name: 'add',
  description: 'Add a new task',
  aliases: ['new', 'create'],
  args: [
    {
      name: 'title',
      description: 'Task title',
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
      name: 'notes',
      short: 'n',
      type: 'string',
      description: 'Task notes/description',
    },
    {
      name: 'due',
      short: 'd',
      type: 'string',
      description: 'Due date (today, tomorrow, YYYY-MM-DD)',
    },
  ],
  examples: [
    'uni gtasks add "Buy groceries"',
    'uni gtasks add "Finish report" --due tomorrow',
    'uni gtasks add "Call mom" --notes "Ask about weekend"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const title = args.title as string;
    const spinner = output.spinner(`Adding task "${title}"...`);

    try {
      // Parse due date
      let due: string | undefined;
      if (flags.due) {
        const dueStr = flags.due as string;
        const now = new Date();

        if (dueStr === 'today') {
          due = now.toISOString().split('T')[0] + 'T00:00:00.000Z';
        } else if (dueStr === 'tomorrow') {
          now.setDate(now.getDate() + 1);
          due = now.toISOString().split('T')[0] + 'T00:00:00.000Z';
        } else if (dueStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          due = dueStr + 'T00:00:00.000Z';
        }
      }

      const task = await gtasks.createTask(flags.list as string, {
        title,
        notes: flags.notes as string | undefined,
        due,
      });

      spinner.success('Task added');

      if (globalFlags.json) {
        output.json(task);
        return;
      }

      console.log('');
      console.log(`  ○ \x1b[1m${task.title}\x1b[0m`);
      if (task.notes) {
        console.log(`    \x1b[90m${task.notes}\x1b[0m`);
      }
      if (task.due) {
        console.log(`    \x1b[90mDue: ${new Date(task.due).toLocaleDateString()}\x1b[0m`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to add task');
      throw error;
    }
  },
};
