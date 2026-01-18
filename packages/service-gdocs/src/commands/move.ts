/**
 * uni gdocs move - Move document to a folder
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const moveCommand: Command = {
  name: 'move',
  description: 'Move document to a different folder',
  args: [
    { name: 'document', description: 'Document ID or URL', required: true },
    { name: 'folder', description: 'Destination folder ID', required: true },
  ],
  examples: [
    'uni gdocs move DOC_ID FOLDER_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.document as string);
    const folderId = args.folder as string;

    const spinner = output.spinner('Moving document...');

    try {
      await gdocs.moveDocument(documentId, folderId);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ success: true, documentId, folderId });
        return;
      }

      output.success('Document moved to folder');
    } catch (error) {
      spinner.fail('Failed to move document');
      throw error;
    }
  },
};
