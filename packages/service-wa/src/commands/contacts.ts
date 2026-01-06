/**
 * uni wa contacts - List contacts (placeholder)
 */

import type { Command, CommandContext } from '@uni/shared';

export const contactsCommand: Command = {
  name: 'contacts',
  description: 'List WhatsApp contacts',
  options: [
    { name: 'limit', short: 'n', type: 'number', description: 'Max results (default: 50)' },
  ],
  examples: [
    'uni wa contacts',
    'uni wa contacts -n 100',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    console.log('Contacts not yet implemented - Baileys requires sync');
  },
};
