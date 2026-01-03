/**
 * uni gkeep get - Get note details
 */

import type { Command, CommandContext } from '@uni/shared';
import { gkeep } from '../api';

export const getCommand: Command = {
  name: 'get',
  description: 'Get note details',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Note ID',
    },
  ],
  examples: ['uni gkeep get <note-id>'],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const noteId = args.id as string;
    const note = await gkeep.getNote(noteId);

    const content = gkeep.extractContent(note);

    if (globalFlags.json) {
      output.json({
        id: gkeep.extractNoteId(note.name),
        title: note.title,
        content,
        created: note.createTime,
        updated: note.updateTime,
        archived: note.archived,
        trashed: note.trashed,
        pinned: note.pinned,
      });
      return;
    }

    output.text('');
    if (note.title) {
      output.text(`Title: ${note.title}`);
    }
    output.text(`ID: ${gkeep.extractNoteId(note.name)}`);
    output.text(`Created: ${new Date(note.createTime).toLocaleString()}`);
    output.text(`Updated: ${new Date(note.updateTime).toLocaleString()}`);

    if (note.archived) output.text('Status: Archived');
    if (note.trashed) output.text('Status: Trashed');
    if (note.pinned) output.text('Pinned: Yes');

    if (content) {
      output.text('\n--- Content ---\n');
      output.text(content);
    }

    output.text('');
  },
};
