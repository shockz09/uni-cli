/**
 * uni notion update - Update a page
 */

import type { Command, CommandContext } from '@uni/shared';
import { notion } from '../api';

export const updateCommand: Command = {
  name: 'update',
  aliases: ['edit', 'modify'],
  description: 'Update page properties or archive',
  args: [
    { name: 'pageId', description: 'Page ID', required: true },
  ],
  options: [
    { name: 'archive', short: 'a', type: 'boolean', description: 'Archive the page' },
    { name: 'unarchive', short: 'u', type: 'boolean', description: 'Unarchive the page' },
    { name: 'title', short: 't', type: 'string', description: 'Update title' },
  ],
  examples: [
    'uni notion update abc123 --archive',
    'uni notion update abc123 --unarchive',
    'uni notion update abc123 --title "New Title"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!notion.hasToken()) {
      output.error('NOTION_TOKEN not set');
      return;
    }

    const pageId = args.pageId as string;

    // Archive/unarchive
    if (flags.archive || flags.unarchive) {
      const spinner = output.spinner(flags.archive ? 'Archiving page...' : 'Unarchiving page...');
      try {
        const page = await notion.archivePage(pageId, !!flags.archive);
        spinner.success(flags.archive ? 'Page archived' : 'Page unarchived');
        if (globalFlags.json) output.json(page);
        return;
      } catch (error) {
        spinner.fail('Failed to update page');
        throw error;
      }
    }

    // Update title
    if (flags.title) {
      const spinner = output.spinner('Updating page...');
      try {
        const properties = {
          title: {
            title: [{ type: 'text', text: { content: flags.title as string } }],
          },
        };
        const page = await notion.updatePage(pageId, properties);
        spinner.success(`Updated title: ${flags.title}`);
        if (globalFlags.json) output.json(page);
        return;
      } catch (error) {
        spinner.fail('Failed to update page');
        throw error;
      }
    }

    output.error('No update option specified. Use --archive, --unarchive, or --title');
  },
};
