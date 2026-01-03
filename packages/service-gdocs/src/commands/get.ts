/**
 * uni gdocs get - Get document content
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const getCommand: Command = {
  name: 'get',
  description: 'Get document content',
  args: [
    {
      name: 'id',
      description: 'Document ID or URL',
      required: true,
    },
  ],
  options: [
    {
      name: 'markdown',
      short: 'm',
      type: 'boolean',
      description: 'Output as markdown',
    },
  ],
  examples: [
    'uni gdocs get 1abc123XYZ',
    'uni gdocs get 1abc123XYZ --markdown',
    'uni gdocs get "https://docs.google.com/document/d/1abc123XYZ/edit"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const asMarkdown = flags.markdown as boolean;

    const spinner = output.spinner('Fetching document...');

    try {
      const doc = await gdocs.getDocument(documentId);
      const content = gdocs.extractText(doc);

      spinner.success('Document fetched');

      if (globalFlags.json) {
        output.json({
          id: doc.documentId,
          title: doc.title,
          content,
        });
        return;
      }

      console.log('');
      console.log(c.bold(doc.title));
      console.log(c.dim(`ID: ${doc.documentId}`));
      console.log('');

      if (asMarkdown) {
        // Basic markdown conversion - treat first line as title
        const lines = content.split('\n');
        if (lines.length > 0) {
          console.log(`# ${lines[0]}`);
          console.log('');
          console.log(lines.slice(1).join('\n'));
        }
      } else {
        console.log(content);
      }

      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch document');
      throw error;
    }
  },
};
