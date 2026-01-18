/**
 * uni gslides masters - List master slides
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const mastersCommand: Command = {
  name: 'masters',
  description: 'List master slides',
  args: [
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
  ],
  examples: [
    'uni gslides masters PRES_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.presentation as string);
    const spinner = output.spinner('Fetching master slides...');

    try {
      const masters = await gslides.getMasters(presentationId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(masters);
        return;
      }

      if (masters.length === 0) {
        output.info('No master slides found.');
        return;
      }

      output.info('');
      output.info(c.bold('Master Slides'));
      output.info('');

      for (const master of masters) {
        output.info(`  ${c.cyan(master.objectId)}`);
        output.info(`    Elements: ${c.dim(master.pageElements.toString())}`);
      }
      output.info('');
    } catch (error) {
      spinner.fail('Failed to fetch master slides');
      throw error;
    }
  },
};
