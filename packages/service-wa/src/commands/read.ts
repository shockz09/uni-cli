/**
 * uni wa read - Read messages from a chat
 * Note: Reading history requires daemon to have synced messages
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { execDaemon } from '../daemon-client';

export const readCommand: Command = {
  name: 'read',
  description: 'Read messages from a chat',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
  ],
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Number of messages (default: 10)',
      default: 10,
    },
  ],
  examples: [
    'uni wa read me',
    'uni wa read 919876543210',
    'uni wa read me -n 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;
    const chat = args.chat as string;
    const limit = (flags.limit as number) || 10;

    const result = await execDaemon({
      action: 'read',
      chat,
      limit,
    });

    if (result.error) {
      output.error(result.error);
      return;
    }

    // For now, reading is limited - Baileys needs history sync
    console.log(c.dim('Note: Message history requires sync. Recent messages may not be available immediately.'));
  },
};
