/**
 * uni wa edit - Edit a sent message via daemon
 */

import type { Command, CommandContext } from '@uni/shared';
import { execDaemon } from '../daemon-client';

export const editCommand: Command = {
  name: 'edit',
  description: 'Edit a sent message',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
    { name: 'messageId', description: 'Message ID to edit', required: true },
    { name: 'newText', description: 'New message text', required: true },
  ],
  examples: [
    'uni wa edit me ABC123 "Fixed typo"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output } = ctx;

    const result = await execDaemon({
      action: 'edit',
      chat: args.chat as string,
      messageId: args.messageId as string,
      newText: args.newText as string,
    });

    if (result.error) {
      output.error(result.error);
      return;
    }

    output.success('Edited!');
  },
};
