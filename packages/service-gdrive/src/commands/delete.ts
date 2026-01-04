/**
 * uni gdrive delete - Delete files from Drive
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete files from Drive',
  aliases: ['rm', 'remove'],
  args: [
    {
      name: 'query',
      description: 'File name or search query',
      required: true,
    },
  ],
  options: [
    {
      name: 'id',
      type: 'string',
      description: 'Delete by file ID directly',
    },
  ],
  examples: [
    'uni gdrive delete "old document"',
    'uni gdrive delete --id 1abc123xyz',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdrive.hasCredentials()) {
      output.error('Google credentials not configured.');
      return;
    }

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    // Direct ID delete
    if (flags.id) {
      await gdrive.deleteFile(flags.id as string);
      if (globalFlags.json) {
        output.json({ deleted: flags.id });
        return;
      }
      output.success('File deleted');
      return;
    }

    // Search and delete
    const query = args.query as string;
    const files = await gdrive.search(query, 50);

    if (files.length === 0) {
      output.error('No files found matching query');
      return;
    }

    // Delete files
    let deleted = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        await gdrive.deleteFile(file.id);
        deleted++;
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    if (globalFlags.json) {
      output.json({ deleted, errors, files: files.map(f => ({ id: f.id, name: f.name })) });
      return;
    }

    if (errors.length > 0) {
      output.error(`Deleted ${deleted}/${files.length} files`);
      for (const err of errors) {
        output.error(err);
      }
    } else {
      output.success(`Deleted ${deleted} file(s)`);
    }
  },
};
