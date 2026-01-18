/**
 * uni gslides layouts - List available slide layouts
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const layoutsCommand: Command = {
  name: 'layouts',
  description: 'List available slide layouts',
  args: [
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
  ],
  examples: [
    'uni gslides layouts PRES_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.presentation as string);
    const spinner = output.spinner('Fetching layouts...');

    try {
      const layouts = await gslides.getLayouts(presentationId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(layouts);
        return;
      }

      if (layouts.length === 0) {
        output.info('No layouts found.');
        return;
      }

      output.info('');
      output.info(c.bold('Available Layouts'));
      output.info('');

      for (const layout of layouts) {
        output.info(`  ${c.cyan(layout.displayName)}`);
        output.info(`    ID: ${c.dim(layout.objectId)}`);
        output.info(`    Type: ${c.dim(layout.layoutType)}`);
      }
      output.info('');
    } catch (error) {
      spinner.fail('Failed to fetch layouts');
      throw error;
    }
  },
};
