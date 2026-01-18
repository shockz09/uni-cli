/**
 * uni gslides move - Move presentation to a folder
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const moveCommand: Command = {
  name: 'move',
  description: 'Move presentation to a different folder',
  args: [
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
    { name: 'folder', description: 'Destination folder ID', required: true },
  ],
  examples: [
    'uni gslides move PRES_ID FOLDER_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.presentation as string);
    const folderId = args.folder as string;

    const spinner = output.spinner('Moving presentation...');

    try {
      await gslides.movePresentation(presentationId, folderId);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ success: true, presentationId, folderId });
        return;
      }

      output.success('Presentation moved to folder');
    } catch (error) {
      spinner.fail('Failed to move presentation');
      throw error;
    }
  },
};
