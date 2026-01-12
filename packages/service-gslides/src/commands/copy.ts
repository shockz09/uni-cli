/**
 * uni gslides copy - Copy/duplicate a presentation
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const copyCommand: Command = {
  name: 'copy',
  description: 'Create a copy of a presentation',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'name', short: 'n', type: 'string', description: 'Name for the copy (default: "Copy of <original>"' },
  ],
  examples: [
    'uni gslides copy ID',
    'uni gslides copy ID --name "Q2 Review"',
    'uni gslides copy ID -n "Template Copy"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const copyName = flags.name as string | undefined;

    const spinner = output.spinner(`Copying presentation...`);

    try {
      const newId = await gslides.copyPresentation(presentationId, copyName);

      spinner.success('Presentation copied');

      if (globalFlags.json) {
        output.json({
          sourceId: presentationId,
          newId,
          name: copyName,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('New presentation ID:')} ${newId}`);
        console.log(c.dim(`https://docs.google.com/presentation/d/${newId}/edit`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to copy presentation');
      throw error;
    }
  },
};
