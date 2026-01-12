/**
 * uni gslides rename - Rename a presentation
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const renameCommand: Command = {
  name: 'rename',
  description: 'Rename a presentation',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'title', description: 'New title', required: true },
  ],
  examples: [
    'uni gslides rename 1abc123XYZ "New Title"',
    'uni gslides rename 1abc123XYZ "Q1 Review 2025"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const newTitle = args.title as string;

    const spinner = output.spinner(`Renaming presentation...`);

    try {
      await gslides.renamePresentation(presentationId, newTitle);
      spinner.success(`Renamed to "${newTitle}"`);

      if (globalFlags.json) {
        output.json({ presentationId, title: newTitle, renamed: true });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Presentation:')} ${newTitle}`);
        console.log(c.dim(`https://docs.google.com/presentation/d/${presentationId}/edit`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to rename presentation');
      throw error;
    }
  },
};
