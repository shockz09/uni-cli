/**
 * uni gdocs link - Insert or remove hyperlinks
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const linkCommand: Command = {
  name: 'link',
  description: 'Insert or remove hyperlinks from text',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'start', description: 'Start index', required: true },
    { name: 'end', description: 'End index', required: true },
  ],
  options: [
    { name: 'url', short: 'u', type: 'string', description: 'URL to link to' },
    { name: 'remove', short: 'r', type: 'boolean', description: 'Remove existing link' },
  ],
  examples: [
    'uni gdocs link ID 10 20 --url "https://example.com"',
    'uni gdocs link ID 5 15 --url "https://google.com"',
    'uni gdocs link ID 10 20 --remove',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const startIndex = parseInt(args.start as string, 10);
    const endIndex = parseInt(args.end as string, 10);
    const url = flags.url as string | undefined;
    const remove = flags.remove as boolean;

    if (isNaN(startIndex) || isNaN(endIndex)) {
      output.error('Start and end must be numbers');
      return;
    }

    if (!url && !remove) {
      output.error('Specify --url to add a link or --remove to remove one');
      return;
    }

    const spinner = output.spinner(remove ? 'Removing link...' : 'Adding link...');

    try {
      if (remove) {
        await gdocs.removeLink(documentId, startIndex, endIndex);
        spinner.success(`Removed link from characters ${startIndex}-${endIndex}`);
      } else {
        await gdocs.insertLink(documentId, startIndex, endIndex, url!);
        spinner.success(`Added link to characters ${startIndex}-${endIndex}`);
      }

      if (globalFlags.json) {
        output.json({ startIndex, endIndex, url: remove ? null : url, removed: remove });
      }
    } catch (error) {
      spinner.fail(remove ? 'Failed to remove link' : 'Failed to add link');
      throw error;
    }
  },
};
