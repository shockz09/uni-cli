/**
 * uni gforms list - List recent forms
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gforms } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List recent forms',
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'string',
      description: 'Number of forms to show (default: 10)',
    },
  ],
  examples: ['uni gforms list', 'uni gforms list -n 20'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    const limit = flags.limit ? parseInt(flags.limit as string, 10) : 10;
    const forms = await gforms.listForms(limit);

    if (globalFlags.json) {
      output.json(forms);
      return;
    }

    if (forms.length === 0) {
      console.log(c.dim('No forms found'));
      return;
    }

    output.text('\nRecent Forms:\n');

    for (const form of forms) {
      const modified = new Date(form.modifiedTime).toLocaleDateString();
      output.text(`  ${form.name}`);
      output.text(`    ID: ${form.id} | Modified: ${modified}`);
    }

    output.text('');
  },
};
