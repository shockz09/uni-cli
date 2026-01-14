/**
 * uni gmail forward - Forward an email
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const forwardCommand: Command = {
  name: 'forward',
  aliases: ['fwd'],
  description: 'Forward an email',
  args: [
    { name: 'messageId', description: 'Message ID to forward', required: true },
    { name: 'to', description: 'Recipient email address', required: true },
  ],
  options: [
    { name: 'message', short: 'm', type: 'string', description: 'Additional message to include' },
  ],
  examples: [
    'uni gmail forward MSG_ID "user@example.com"',
    'uni gmail forward MSG_ID "user@example.com" --message "FYI - see below"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const messageId = args.messageId as string;
    const to = args.to as string;
    const additionalMessage = flags.message as string | undefined;

    const spinner = output.spinner(`Forwarding to ${to}...`);
    try {
      const result = await gmail.forwardEmail(messageId, to, additionalMessage);
      spinner.success(`Forwarded: ${result.id}`);

      if (globalFlags.json) {
        output.json(result);
      }
    } catch (error) {
      spinner.fail('Failed to forward email');
      throw error;
    }
  },
};
