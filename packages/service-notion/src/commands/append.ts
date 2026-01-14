/**
 * uni notion append - Quick append content to a page
 */

import type { Command, CommandContext } from '@uni/shared';
import { notion } from '../api';

export const appendCommand: Command = {
  name: 'append',
  aliases: ['write', 'add-content'],
  description: 'Quickly append text to a page',
  args: [
    { name: 'pageId', description: 'Page ID', required: true },
    { name: 'content', description: 'Text content to append', required: true },
  ],
  options: [
    { name: 'type', short: 't', type: 'string', description: 'Block type: paragraph, heading, todo, bullet (default: paragraph)' },
  ],
  examples: [
    'uni notion append abc123 "New note content"',
    'uni notion append abc123 "Important Task" --type todo',
    'uni notion append abc123 "Section Title" --type heading',
    'uni notion append abc123 "List item" --type bullet',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!notion.hasToken()) {
      output.error('NOTION_TOKEN not set');
      return;
    }

    const pageId = args.pageId as string;
    const content = args.content as string;
    const type = (flags.type as string) || 'paragraph';

    const spinner = output.spinner('Appending content...');
    try {
      let block: Record<string, unknown>;

      switch (type) {
        case 'heading':
        case 'h1':
          block = notion.createHeadingBlock(content, 1);
          break;
        case 'h2':
          block = notion.createHeadingBlock(content, 2);
          break;
        case 'h3':
          block = notion.createHeadingBlock(content, 3);
          break;
        case 'todo':
        case 'task':
          block = notion.createTodoBlock(content);
          break;
        case 'bullet':
        case 'list':
          block = notion.createBulletBlock(content);
          break;
        default:
          block = notion.createParagraphBlock(content);
      }

      const result = await notion.appendBlocks(pageId, [block]);
      spinner.success(`Added ${type}: "${content.slice(0, 30)}${content.length > 30 ? '...' : ''}"`);

      if (globalFlags.json) {
        output.json(result);
      }
    } catch (error) {
      spinner.fail('Failed to append content');
      throw error;
    }
  },
};
