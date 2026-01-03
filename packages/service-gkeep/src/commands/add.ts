/**
 * uni gkeep add - Create a new note
 */

import type { Command, CommandContext } from '@uni/shared';
import { gkeep } from '../api';

export const addCommand: Command = {
  name: 'add',
  description: 'Create a new note',
  args: [
    {
      name: 'content',
      required: true,
      description: 'Note content',
    },
  ],
  options: [
    {
      name: 'title',
      short: 't',
      type: 'string',
      description: 'Note title',
    },
    {
      name: 'list',
      short: 'l',
      type: 'boolean',
      description: 'Create as checklist (content as comma-separated items)',
    },
  ],
  examples: [
    'uni gkeep add "Remember to call mom"',
    'uni gkeep add "Shopping list" --title "Groceries" --list',
    'uni gkeep add "Milk,Eggs,Bread" -l -t "Shopping"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    const content = args.content as string;
    const title = (flags.title as string) || '';
    const isList = flags.list === true;

    let note;
    if (isList) {
      const items = content.split(',').map(s => s.trim()).filter(Boolean);
      note = await gkeep.createListNote(title, items);
    } else {
      note = await gkeep.createNote(title, content);
    }

    const noteId = gkeep.extractNoteId(note.name);

    if (globalFlags.json) {
      output.json({
        id: noteId,
        title: note.title,
        content: gkeep.extractContent(note),
        type: isList ? 'list' : 'text',
      });
      return;
    }

    output.success('Created note');
    output.text(`ID: ${noteId}`);
    if (note.title) {
      output.text(`Title: ${note.title}`);
    }
    output.text(`Type: ${isList ? 'Checklist' : 'Text'}`);
  },
};
