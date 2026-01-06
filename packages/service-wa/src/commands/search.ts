/**
 * uni wa search - Search messages (placeholder)
 */

import type { Command, CommandContext } from '@uni/shared';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search messages across chats',
  args: [
    { name: 'query', description: 'Search query', required: true },
  ],
  options: [
    { name: 'chat', short: 'c', type: 'string', description: 'Limit to specific chat' },
    { name: 'limit', short: 'n', type: 'number', description: 'Max results (default: 20)' },
  ],
  examples: [
    'uni wa search "meeting"',
    'uni wa search "invoice" -c 919876543210',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    console.log('Search not yet implemented - Baileys requires full history sync');
  },
};
