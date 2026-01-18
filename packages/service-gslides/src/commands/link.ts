/**
 * uni gslides link - Add a hyperlink to text in a shape
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const linkCommand: Command = {
  name: 'link',
  description: 'Add a hyperlink to text in a shape',
  args: [
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
    { name: 'shape', description: 'Shape object ID', required: true },
    { name: 'url', description: 'URL to link to', required: true },
  ],
  options: [
    { name: 'start', alias: 's', description: 'Start index (default: 0, all text)', type: 'number' },
    { name: 'end', alias: 'e', description: 'End index', type: 'number' },
  ],
  examples: [
    'uni gslides link PRES_ID SHAPE_ID "https://example.com"',
    'uni gslides link PRES_ID SHAPE_ID "https://example.com" -s 0 -e 10',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, options, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.presentation as string);
    const shapeId = args.shape as string;
    const url = args.url as string;
    const startIndex = (options.start as number) || 0;
    const endIndex = options.end as number | undefined;

    const spinner = output.spinner('Adding link...');

    try {
      await gslides.addLink(presentationId, shapeId, url, startIndex, endIndex);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ success: true, shapeId, url });
        return;
      }

      output.success('Link added to text');
    } catch (error) {
      spinner.fail('Failed to add link');
      throw error;
    }
  },
};
