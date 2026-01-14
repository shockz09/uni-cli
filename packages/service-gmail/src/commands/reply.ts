/**
 * uni gmail reply - Reply to an email
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const replyCommand: Command = {
  name: 'reply',
  description: 'Reply to an email',
  args: [
    { name: 'messageId', description: 'Message ID to reply to', required: true },
    { name: 'body', description: 'Reply message body', required: true },
  ],
  options: [
    { name: 'all', short: 'a', type: 'boolean', description: 'Reply all (include all recipients)' },
  ],
  examples: [
    'uni gmail reply MSG_ID "Thanks for your email!"',
    'uni gmail reply MSG_ID "Got it, thanks!" --all',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const messageId = args.messageId as string;
    const body = args.body as string;
    const replyAll = Boolean(flags.all);

    const spinner = output.spinner(replyAll ? 'Sending reply all...' : 'Sending reply...');
    try {
      const result = await gmail.replyToEmail(messageId, body, replyAll);
      spinner.success(`Reply sent: ${result.id}`);

      if (globalFlags.json) {
        output.json(result);
      }
    } catch (error) {
      spinner.fail('Failed to send reply');
      throw error;
    }
  },
};
