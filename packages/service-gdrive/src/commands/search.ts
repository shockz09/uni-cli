/**
 * uni gdrive search - Search files
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdrive } from '../api';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search files',
  aliases: ['s', 'find'],
  args: [
    {
      name: 'query',
      description: 'Search query',
      required: true,
    },
  ],
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Maximum results',
      default: 20,
    },
  ],
  examples: [
    'uni gdrive search "meeting notes"',
    'uni gdrive search "project" --limit 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth".');
      return;
    }

    const query = args.query;
    if (!query) {
      output.error('Please provide a search query');
      return;
    }

    const spinner = output.spinner(`Searching for "${query}"...`);

    try {
      const files = await gdrive.search(query, flags.limit as number);

      spinner.success(`Found ${files.length} files`);

      if (globalFlags.json) {
        output.json(files);
        return;
      }

      if (files.length === 0) {
        output.info('No files found');
        return;
      }

      console.log('');
      for (const file of files) {
        const icon = gdrive.getMimeIcon(file.mimeType);
        console.log(`${icon} ${c.bold(file.name)}`);
        if (file.webViewLink) {
          console.log(`   ${c.cyan(file.webViewLink)}`);
        }
      }
      console.log('');
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
