/**
 * uni gkeep list - List notes
 */

import type { Command, CommandContext } from '@uni/shared';
import { gkeep } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List notes',
  options: [
    {
      name: 'archived',
      short: 'a',
      type: 'boolean',
      description: 'Show archived notes',
    },
    {
      name: 'trashed',
      short: 't',
      type: 'boolean',
      description: 'Show trashed notes',
    },
  ],
  examples: ['uni gkeep list', 'uni gkeep list --archived', 'uni gkeep list --trashed'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    const notes = await gkeep.listNotes({
      trashed: flags.trashed === true,
      archived: flags.archived === true ? true : undefined,
    });

    // Filter out archived unless explicitly requested
    const filtered = flags.archived ? notes : notes.filter(n => !n.archived);

    if (globalFlags.json) {
      output.json(
        filtered.map(n => ({
          id: gkeep.extractNoteId(n.name),
          title: n.title || '(untitled)',
          content: gkeep.extractContent(n),
          created: n.createTime,
          updated: n.updateTime,
          archived: n.archived,
          pinned: n.pinned,
        }))
      );
      return;
    }

    if (filtered.length === 0) {
      output.info('No notes found.');
      return;
    }

    const label = flags.archived ? 'Archived Notes' : flags.trashed ? 'Trashed Notes' : 'Notes';
    output.text(`\n${label}:\n`);

    for (const note of filtered) {
      const id = gkeep.extractNoteId(note.name);
      const title = note.title || '(untitled)';
      const preview = gkeep.extractContent(note).slice(0, 50).replace(/\n/g, ' ');
      const pinned = note.pinned ? ' [pinned]' : '';

      output.text(`  ${title}${pinned}`);
      output.text(`    ID: ${id}`);
      if (preview) {
        output.text(`    ${preview}${preview.length >= 50 ? '...' : ''}`);
      }
    }

    output.text('');
  },
};
