/**
 * uni gtasks list - List tasks
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gtasks } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List tasks',
  aliases: ['ls'],
  options: [
    {
      name: 'list',
      short: 'l',
      type: 'string',
      description: 'Task list ID (default: @default)',
      default: '@default',
    },
    {
      name: 'completed',
      short: 'c',
      type: 'boolean',
      description: 'Include completed tasks',
      default: false,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Max tasks',
      default: 20,
    },
  ],
  examples: [
    'uni gtasks list',
    'uni gtasks list --completed',
    'uni gtasks list --list Work',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching tasks...');

    try {
      const tasks = await gtasks.getTasks(flags.list as string, {
        showCompleted: flags.completed as boolean,
        maxResults: flags.limit as number,
      });

      spinner.success(`Found ${tasks.length} task(s)`);

      if (globalFlags.json) {
        output.json(tasks);
        return;
      }

      if (tasks.length === 0) {
        console.log(c.dim('No tasks'));
        return;
      }

      console.log('');
      for (const task of tasks) {
        const checkbox = task.status === 'completed' ? c.green('✓') : '○';
        const title = task.status === 'completed'
          ? c.dim(c.strikethrough(task.title))
          : c.bold(task.title);

        let due = '';
        if (task.due) {
          const dueDate = new Date(task.due);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isOverdue = dueDate < today && task.status !== 'completed';
          due = isOverdue
            ? ` ${c.red(`(${dueDate.toLocaleDateString()})`)}`
            : ` ${c.dim(`(${dueDate.toLocaleDateString()})`)}`;
        }

        console.log(`  ${checkbox} ${title}${due}  ${c.dim(`[${task.id}]`)}`);
        if (task.notes) {
          console.log(`    ${c.dim(`${task.notes.slice(0, 60)}${task.notes.length > 60 ? '...' : ''}`)}`);
        }
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch tasks');
      throw error;
    }
  },
};
