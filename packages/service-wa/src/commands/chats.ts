/**
 * uni wa chats - List recent chats via daemon
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { execDaemon } from '../daemon-client';

export const chatsCommand: Command = {
  name: 'chats',
  description: 'List recent chats',
  aliases: ['list'],
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Number of chats (default: 20)',
      default: 20,
    },
  ],
  examples: [
    'uni wa chats',
    'uni wa chats -n 10',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;
    const limit = (flags.limit as number) || 20;

    const result = await execDaemon({
      action: 'chats',
      limit,
    });

    if (result.error) {
      output.error(result.error);
      return;
    }

    const chats = result.chats || [];

    if (globalFlags.json) {
      output.json(chats);
      return;
    }

    if (chats.length === 0) {
      console.log('No chats found');
      return;
    }

    console.log(`\n${c.bold('Chats')} (${chats.length}):\n`);
    for (const chat of chats) {
      console.log(`  ${c.bold(chat.name || 'Unknown')}`);
      console.log(`    ${c.dim(chat.id)}\n`);
    }
  },
};
