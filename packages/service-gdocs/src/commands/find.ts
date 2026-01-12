/**
 * uni gdocs find - Find text in document
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const findCommand: Command = {
  name: 'find',
  description: 'Find text in document, optionally replace',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'text', description: 'Text to find', required: true },
  ],
  options: [
    { name: 'replace', short: 'r', type: 'string', description: 'Replace with this text' },
    { name: 'case', short: 'c', type: 'boolean', description: 'Case-sensitive search' },
  ],
  examples: [
    'uni gdocs find 1abc123XYZ "old text"',
    'uni gdocs find 1abc123XYZ "TODO" --replace "DONE"',
    'uni gdocs find 1abc123XYZ "Error" --case',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const searchText = args.text as string;
    const replaceText = flags.replace as string | undefined;
    const caseSensitive = flags.case as boolean || false;

    const spinner = output.spinner(replaceText ? 'Finding and replacing...' : 'Finding text...');

    try {
      if (replaceText !== undefined) {
        // Replace mode
        const count = await gdocs.replaceText(documentId, searchText, replaceText, caseSensitive);
        spinner.success(`Replaced ${count} occurrence(s)`);

        if (globalFlags.json) {
          output.json({
            documentId,
            searchText,
            replaceText,
            occurrences: count,
          });
          return;
        }

        if (!output.isPiped()) {
          console.log('');
          console.log(`${c.green('Replaced:')} "${searchText}" → "${replaceText}"`);
          console.log(`${c.green('Count:')} ${count} occurrence(s)`);
          console.log('');
        }
      } else {
        // Find mode - get document and search
        const doc = await gdocs.getDocument(documentId);
        const content = gdocs.extractText(doc);

        // Find all occurrences with context
        const regex = new RegExp(
          searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          caseSensitive ? 'g' : 'gi'
        );

        const matches: { index: number; context: string }[] = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
          const start = Math.max(0, match.index - 30);
          const end = Math.min(content.length, match.index + searchText.length + 30);
          const context = content.slice(start, end).replace(/\n/g, ' ');
          matches.push({ index: match.index, context });
        }

        spinner.success(`Found ${matches.length} occurrence(s)`);

        if (globalFlags.json) {
          output.json({
            documentId,
            searchText,
            caseSensitive,
            occurrences: matches.length,
            matches: matches.slice(0, 20), // Limit to 20 in JSON
          });
          return;
        }

        if (!output.isPiped()) {
          console.log('');
          console.log(`${c.green('Found:')} ${matches.length} occurrence(s) of "${searchText}"`);

          if (matches.length > 0) {
            console.log('');
            const showCount = Math.min(matches.length, 10);
            for (let i = 0; i < showCount; i++) {
              const m = matches[i];
              const highlighted = m.context.replace(
                new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi'),
                c.yellow(searchText)
              );
              console.log(`  ${c.dim(`${i + 1}.`)} ...${highlighted}...`);
            }
            if (matches.length > 10) {
              console.log(c.dim(`  ... and ${matches.length - 10} more`));
            }
          }
          console.log('');
        }
      }
    } catch (error) {
      spinner.fail('Failed to search document');
      throw error;
    }
  },
};
