/**
 * uni gmail count - Count emails
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gmail } from '../api';

export const countCommand: Command = {
  name: 'count',
  description: 'Count emails (total and unread)',
  options: [
    { name: 'label', short: 'l', type: 'string', description: 'Filter by label (default: INBOX)' },
  ],
  examples: [
    'uni gmail count',
    'uni gmail count --label SPAM',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const label = (flags.label as string) || 'INBOX';
    const spinner = output.spinner('Counting emails...');

    try {
      const [total, unread] = await Promise.all([
        gmail.listEmails({ maxResults: 1, labelIds: [label] }),
        gmail.listEmails({ maxResults: 1, q: 'is:unread', labelIds: [label] }),
      ]);

      // Get actual counts from API
      const response = await gmail.request<{ messagesTotal: number; messagesUnread: number }>(
        `/users/me/labels/${label}`
      );

      spinner.stop();

      if (globalFlags.json) {
        output.json({
          label,
          total: response.messagesTotal,
          unread: response.messagesUnread,
        });
        return;
      }

      output.info('');
      output.info(`${c.bold(label)}`);
      output.info(`  Total:  ${c.cyan(response.messagesTotal.toLocaleString())}`);
      output.info(`  Unread: ${c.yellow(response.messagesUnread.toLocaleString())}`);
      output.info('');
    } catch (error) {
      spinner.fail('Failed to count emails');
      throw error;
    }
  },
};
