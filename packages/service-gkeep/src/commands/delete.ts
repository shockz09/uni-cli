/**
 * uni gkeep delete - Delete a note
 */

import type { Command, CommandContext } from '@uni/shared';
import { gkeep } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a note (moves to trash)',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Note ID',
    },
  ],
  examples: ['uni gkeep delete <note-id>'],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const noteId = args.id as string;

    await gkeep.deleteNote(noteId);

    if (globalFlags.json) {
      output.json({
        id: noteId,
        deleted: true,
      });
      return;
    }

    output.success(`Deleted note: ${noteId}`);
  },
};
