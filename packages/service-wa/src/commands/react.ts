/**
 * uni wa react - React to a message via daemon
 */

import type { Command, CommandContext } from '@uni/shared';
import { execDaemon } from '../daemon-client';

export const reactCommand: Command = {
  name: 'react',
  description: 'React to a message with an emoji',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
    { name: 'messageId', description: 'Message ID to react to', required: true },
    { name: 'emoji', description: 'Emoji to react with (empty to remove)', required: false },
  ],
  examples: [
    'uni wa react me ABC123 "👍"',
    'uni wa react 919876543210 XYZ789 "❤️"',
    'uni wa react me ABC123 ""',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output } = ctx;
    const emoji = (args.emoji as string) || '';

    const result = await execDaemon({
      action: 'react',
      chat: args.chat as string,
      messageId: args.messageId as string,
      emoji,
    });

    if (result.error) {
      output.error(result.error);
      return;
    }

    if (emoji) {
      output.success(`Reacted with ${emoji}`);
    } else {
      output.success('Reaction removed');
    }
  },
};
