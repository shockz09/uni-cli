/**
 * uni wa forward - Forward a message via daemon
 */

import type { Command, CommandContext } from '@uni/shared';
import { execDaemon } from '../daemon-client';

export const forwardCommand: Command = {
  name: 'forward',
  description: 'Forward a message to another chat',
  args: [
    { name: 'fromChat', description: 'Source chat (phone number or "me")', required: true },
    { name: 'toChat', description: 'Destination chat', required: true },
    { name: 'messageId', description: 'Message ID to forward', required: true },
  ],
  examples: [
    'uni wa forward me 919876543210 ABC123',
    'uni wa forward 919876543210 me XYZ789',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output } = ctx;

    const result = await execDaemon({
      action: 'forward',
      fromChat: args.fromChat as string,
      toChat: args.toChat as string,
      messageId: args.messageId as string,
    });

    if (result.error) {
      output.error(result.error);
      return;
    }

    output.success('Forwarded!');
  },
};
