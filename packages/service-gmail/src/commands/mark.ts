/**
 * uni gmail mark - Mark emails as read/unread
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const markCommand: Command = {
  name: 'mark',
  description: 'Mark email as read or unread',
  args: [
    { name: 'messageId', description: 'Message ID', required: true },
  ],
  options: [
    { name: 'read', short: 'r', type: 'boolean', description: 'Mark as read' },
    { name: 'unread', short: 'u', type: 'boolean', description: 'Mark as unread' },
  ],
  examples: [
    'uni gmail mark MSG_ID --read',
    'uni gmail mark MSG_ID --unread',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const messageId = args.messageId as string;

    if (!flags.read && !flags.unread) {
      output.error('Specify --read or --unread');
      return;
    }

    const markAsRead = Boolean(flags.read);
    const spinner = output.spinner(markAsRead ? 'Marking as read...' : 'Marking as unread...');

    try {
      if (markAsRead) {
        await gmail.markAsRead(messageId);
        spinner.success('Marked as read');
      } else {
        await gmail.markAsUnread(messageId);
        spinner.success('Marked as unread');
      }

      if (globalFlags.json) {
        output.json({ messageId, read: markAsRead });
      }
    } catch (error) {
      spinner.fail('Failed to update message');
      throw error;
    }
  },
};
