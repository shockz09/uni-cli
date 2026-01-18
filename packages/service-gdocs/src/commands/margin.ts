/**
 * uni gdocs margin - Set document margins
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const marginCommand: Command = {
  name: 'margin',
  description: 'Set document margins (in points, 72pt = 1 inch)',
  args: [
    { name: 'document', description: 'Document ID or URL', required: true },
  ],
  options: [
    { name: 'top', alias: 't', description: 'Top margin in points', type: 'number' },
    { name: 'bottom', alias: 'b', description: 'Bottom margin in points', type: 'number' },
    { name: 'left', alias: 'l', description: 'Left margin in points', type: 'number' },
    { name: 'right', alias: 'r', description: 'Right margin in points', type: 'number' },
    { name: 'all', alias: 'a', description: 'Set all margins to this value', type: 'number' },
  ],
  examples: [
    'uni gdocs margin DOC_ID --all 72',
    'uni gdocs margin DOC_ID -t 72 -b 72 -l 54 -r 54',
    'uni gdocs margin DOC_ID --left 36 --right 36',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, options, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.document as string);

    const margins: { top?: number; bottom?: number; left?: number; right?: number } = {};

    if (options.all !== undefined) {
      const all = options.all as number;
      margins.top = all;
      margins.bottom = all;
      margins.left = all;
      margins.right = all;
    } else {
      if (options.top !== undefined) margins.top = options.top as number;
      if (options.bottom !== undefined) margins.bottom = options.bottom as number;
      if (options.left !== undefined) margins.left = options.left as number;
      if (options.right !== undefined) margins.right = options.right as number;
    }

    if (Object.keys(margins).length === 0) {
      output.error('At least one margin must be specified');
      return;
    }

    const spinner = output.spinner('Updating margins...');

    try {
      await gdocs.updateMargins(documentId, margins);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ success: true, margins });
        return;
      }

      output.success('Margins updated');
      if (margins.top !== undefined) output.info(`  Top: ${c.cyan(margins.top + 'pt')}`);
      if (margins.bottom !== undefined) output.info(`  Bottom: ${c.cyan(margins.bottom + 'pt')}`);
      if (margins.left !== undefined) output.info(`  Left: ${c.cyan(margins.left + 'pt')}`);
      if (margins.right !== undefined) output.info(`  Right: ${c.cyan(margins.right + 'pt')}`);
    } catch (error) {
      spinner.fail('Failed to update margins');
      throw error;
    }
  },
};
