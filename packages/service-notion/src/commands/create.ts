/**
 * uni notion create - Create a new page
 */

import type { Command, CommandContext } from '@uni/shared';
import { notion } from '../api';

export const createCommand: Command = {
  name: 'create',
  aliases: ['new', 'add'],
  description: 'Create a new page',
  args: [
    { name: 'title', description: 'Page title', required: true },
  ],
  options: [
    { name: 'parent', short: 'p', type: 'string', description: 'Parent page ID' },
    { name: 'database', short: 'd', type: 'string', description: 'Database ID to add to' },
    { name: 'content', short: 'c', type: 'string', description: 'Initial content (paragraph)' },
  ],
  examples: [
    'uni notion create "Meeting Notes"',
    'uni notion create "New Task" --database abc123',
    'uni notion create "Ideas" --parent xyz789 --content "Initial thoughts here"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!notion.hasToken()) {
      output.error('NOTION_TOKEN not set');
      return;
    }

    const title = args.title as string;
    const parentId = flags.parent as string | undefined;
    const databaseId = flags.database as string | undefined;
    const content = flags.content as string | undefined;

    if (!parentId && !databaseId) {
      output.error('Either --parent or --database is required');
      return;
    }

    const spinner = output.spinner('Creating page...');
    try {
      // Build parent
      const parent = databaseId
        ? { database_id: databaseId }
        : { page_id: parentId as string };

      // Build properties based on parent type
      let properties: Record<string, unknown>;
      if (databaseId) {
        // For databases, use 'title' property (common in Notion databases)
        properties = {
          title: {
            title: [{ type: 'text', text: { content: title } }],
          },
        };
      } else {
        // For pages, use 'title' type property
        properties = {
          title: {
            title: [{ type: 'text', text: { content: title } }],
          },
        };
      }

      // Build children (content blocks)
      const children: unknown[] = [];
      if (content) {
        children.push(notion.createParagraphBlock(content));
      }

      const page = await notion.createPage(parent, properties, children.length > 0 ? children : undefined);
      spinner.success(`Created: ${title}`);

      if (globalFlags.json) {
        output.json(page);
        return;
      }

      output.info(`  ID: ${page.id}`);
      output.info(`  URL: ${page.url}`);
    } catch (error) {
      spinner.fail('Failed to create page');
      throw error;
    }
  },
};
