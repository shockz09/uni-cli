/**
 * uni gslides delete - Delete a presentation
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a presentation (moves to trash)',
  args: [{ name: 'id', description: 'Presentation ID or URL', required: true }],
  options: [
    { name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation' },
  ],
  examples: [
    'uni gslides delete 1abc123XYZ',
    'uni gslides delete 1abc123XYZ --force',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);

    // Get presentation info first
    const presentation = await gslides.getPresentation(presentationId);
    const title = presentation.title;

    if (!flags.force && !output.isPiped()) {
      console.log(`${c.yellow('Warning:')} About to delete "${title}"`);
      console.log(c.dim('Use --force to skip this warning'));
    }

    const spinner = output.spinner(`Deleting presentation...`);

    try {
      await gslides.deletePresentation(presentationId);
      spinner.success(`Deleted "${title}"`);

      if (globalFlags.json) {
        output.json({ presentationId, title, deleted: true });
      }
    } catch (error) {
      spinner.fail('Failed to delete presentation');
      throw error;
    }
  },
};
