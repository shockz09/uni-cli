/**
 * uni gdocs import - Import content from file into document
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export const importCommand: Command = {
  name: 'import',
  description: 'Import content from text file into document',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'file', description: 'File path to import (.txt, .md)', required: true },
  ],
  options: [
    { name: 'append', short: 'a', type: 'boolean', description: 'Append to existing content (default: replace)' },
    { name: 'at', type: 'string', description: 'Insert position: "start", "end", or index (default: end for append)' },
  ],
  examples: [
    'uni gdocs import ID notes.txt',
    'uni gdocs import ID readme.md --append',
    'uni gdocs import ID content.txt --at start',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const filePath = resolve(args.file as string);
    const appendMode = flags.append as boolean || false;
    const position = flags.at as string | undefined;

    if (!existsSync(filePath)) {
      output.error(`File not found: ${filePath}`);
      return;
    }

    const spinner = output.spinner(`Importing file...`);

    try {
      const content = readFileSync(filePath, 'utf-8');

      if (appendMode || position) {
        // Append or insert at position
        await gdocs.insertText(documentId, content, position || 'end');
      } else {
        // Replace all content - clear first then insert
        const doc = await gdocs.getDocument(documentId);
        const endIndex = doc.body?.content?.slice(-1)[0]?.endIndex || 1;

        if (endIndex > 2) {
          // Clear existing content (keep minimum structure)
          await gdocs.clearContent(documentId);
        }

        // Insert new content
        await gdocs.insertText(documentId, content, 'start');
      }

      spinner.success(`Imported ${content.length} characters`);

      if (globalFlags.json) {
        output.json({
          documentId,
          file: filePath,
          characters: content.length,
          mode: appendMode ? 'append' : 'replace',
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Imported:')} ${filePath}`);
        console.log(`${c.green('Characters:')} ${content.length}`);
        console.log(`${c.green('Mode:')} ${appendMode ? 'append' : 'replace'}`);
        console.log(c.dim(`https://docs.google.com/document/d/${documentId}/edit`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to import file');
      throw error;
    }
  },
};
