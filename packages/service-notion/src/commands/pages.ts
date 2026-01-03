/**
 * uni notion pages - Page commands
 */

import type { Command, CommandContext } from '@uni/shared';
import { notion } from '../api';

const viewCommand: Command = {
  name: 'view',
  description: 'View a page',
  aliases: ['show', 'get'],
  args: [
    {
      name: 'page',
      description: 'Page ID or URL',
      required: true,
    },
  ],
  options: [
    {
      name: 'content',
      short: 'c',
      type: 'boolean',
      description: 'Include page content',
      default: false,
    },
  ],
  examples: [
    'uni notion pages view abc123',
    'uni notion pages view abc123 --content',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!notion.hasToken()) {
      output.error('Notion token not configured.');
      return;
    }

    let pageId = args.page;

    // Extract ID from URL if needed
    if (pageId.includes('notion.so')) {
      const match = pageId.match(/([a-f0-9]{32})/);
      if (match) pageId = match[1];
    }

    // Format ID with dashes if needed
    if (pageId.length === 32 && !pageId.includes('-')) {
      pageId = `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20)}`;
    }

    const spinner = output.spinner('Fetching page...');

    try {
      const page = await notion.getPage(pageId);
      spinner.success('Page loaded');

      if (globalFlags.json) {
        if (flags.content) {
          const blocks = await notion.getPageContent(pageId);
          output.json({ page, blocks });
        } else {
          output.json(page);
        }
        return;
      }

      // Extract title
      let title = 'Untitled';
      for (const [, value] of Object.entries(page.properties)) {
        const prop = value as Record<string, unknown>;
        if (prop.type === 'title' && Array.isArray(prop.title)) {
          title = (prop.title as Array<{ plain_text: string }>)
            .map(t => t.plain_text)
            .join('');
          break;
        }
      }

      console.log('');
      console.log(`📄 \x1b[1m${title}\x1b[0m`);
      console.log(`   \x1b[36m${page.url}\x1b[0m`);
      console.log(`   Created: ${new Date(page.created_time).toLocaleDateString()}`);
      console.log(`   Updated: ${new Date(page.last_edited_time).toLocaleDateString()}`);

      if (flags.content) {
        const blocks = await notion.getPageContent(pageId);
        console.log('\n\x1b[90m─── Content ───\x1b[0m\n');

        for (const block of blocks) {
          const text = notion.extractBlockText(block);
          if (text) {
            const prefix = block.type === 'heading_1' ? '# ' :
              block.type === 'heading_2' ? '## ' :
                block.type === 'heading_3' ? '### ' :
                  block.type === 'bulleted_list_item' ? '• ' :
                    block.type === 'numbered_list_item' ? '1. ' :
                      block.type === 'to_do' ? '☐ ' : '';
            console.log(`${prefix}${text}`);
          }
        }
      }

      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch page');
      throw error;
    }
  },
};

export const pagesCommand: Command = {
  name: 'pages',
  description: 'Manage pages',
  aliases: ['page', 'p'],
  subcommands: [viewCommand],
  examples: [
    'uni notion pages view abc123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output } = ctx;
    output.info('Use "uni notion pages view <id>" to view a page');
    output.info('Use "uni notion search" to find pages');
  },
};
