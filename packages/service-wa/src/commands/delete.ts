/**
 * uni wa delete - Delete a message via daemon
 */

import type { Command, CommandContext } from '@uni/shared';
import { execDaemon } from '../daemon-client';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a message',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
    { name: 'messageId', description: 'Message ID to delete', required: true },
  ],
  examples: [
    'uni wa delete me ABC123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output } = ctx;

    const result = await execDaemon({
      action: 'delete',
      chat: args.chat as string,
      messageId: args.messageId as string,
    });

    if (result.error) {
      output.error(result.error);
      return;
    }

    output.success('Deleted!');
  },
};
