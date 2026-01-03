/**
 * uni gslides list - List recent presentations
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List recent presentations',
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'string',
      description: 'Number of presentations to show (default: 10)',
    },
  ],
  examples: ['uni gslides list', 'uni gslides list -n 20'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    const limit = flags.limit ? parseInt(flags.limit as string, 10) : 10;
    const presentations = await gslides.listPresentations(limit);

    if (globalFlags.json) {
      output.json(presentations);
      return;
    }

    if (presentations.length === 0) {
      output.info('No presentations found.');
      return;
    }

    output.text('\nRecent Presentations:\n');

    for (const pres of presentations) {
      const modified = new Date(pres.modifiedTime).toLocaleDateString();
      output.text(`  ${pres.name}`);
      output.text(`    ID: ${pres.id} | Modified: ${modified}`);
    }

    output.text('');
  },
};
