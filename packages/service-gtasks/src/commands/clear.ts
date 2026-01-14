/**
 * uni gtasks clear - Clear completed tasks
 */

import type { Command, CommandContext } from '@uni/shared';
import { gtasks } from '../api';

export const clearCommand: Command = {
  name: 'clear',
  description: 'Clear all completed tasks from a list',
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID (default: @default)' },
  ],
  examples: [
    'uni gtasks clear',
    'uni gtasks clear --list LIST_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const listId = (flags.list as string) || '@default';

    const spinner = output.spinner('Clearing completed tasks...');
    try {
      await gtasks.clearCompleted(listId);
      spinner.success('Cleared completed tasks');

      if (globalFlags.json) {
        output.json({ cleared: true, listId });
      }
    } catch (error) {
      spinner.fail('Failed to clear tasks');
      throw error;
    }
  },
};
