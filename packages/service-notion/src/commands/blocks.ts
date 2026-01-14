/**
 * uni notion blocks - Manage page blocks
 */

import type { Command, CommandContext } from '@uni/shared';
import { notion } from '../api';

export const blocksCommand: Command = {
  name: 'blocks',
  aliases: ['block', 'content'],
  description: 'View and manage page content blocks',
  args: [
    { name: 'pageId', description: 'Page or block ID', required: true },
  ],
  options: [
    { name: 'add', short: 'a', type: 'string', description: 'Add a paragraph block' },
    { name: 'heading', short: 'h', type: 'string', description: 'Add a heading block' },
    { name: 'todo', type: 'string', description: 'Add a todo block' },
    { name: 'bullet', short: 'b', type: 'string', description: 'Add a bullet point' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete a block by ID' },
    { name: 'level', short: 'l', type: 'string', description: 'Heading level 1-3 (default: 1)' },
  ],
  examples: [
    'uni notion blocks abc123',
    'uni notion blocks abc123 --add "New paragraph text"',
    'uni notion blocks abc123 --heading "New Section" --level 2',
    'uni notion blocks abc123 --todo "Task to complete"',
    'uni notion blocks abc123 --bullet "List item"',
    'uni notion blocks abc123 --delete block-id-123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!notion.hasToken()) {
      output.error('NOTION_TOKEN not set');
      return;
    }

    const pageId = args.pageId as string;

    // Delete a block
    if (flags.delete) {
      const spinner = output.spinner('Deleting block...');
      try {
        await notion.deleteBlock(flags.delete as string);
        spinner.success('Block deleted');
        if (globalFlags.json) output.json({ deleted: true, blockId: flags.delete });
        return;
      } catch (error) {
        spinner.fail('Failed to delete block');
        throw error;
      }
    }

    // Add a paragraph
    if (flags.add) {
      const spinner = output.spinner('Adding block...');
      try {
        const block = notion.createParagraphBlock(flags.add as string);
        const result = await notion.appendBlocks(pageId, [block]);
        spinner.success('Paragraph added');
        if (globalFlags.json) output.json(result);
        return;
      } catch (error) {
        spinner.fail('Failed to add block');
        throw error;
      }
    }

    // Add a heading
    if (flags.heading) {
      const spinner = output.spinner('Adding heading...');
      try {
        const level = parseInt((flags.level as string) || '1', 10) as 1 | 2 | 3;
        const block = notion.createHeadingBlock(flags.heading as string, level);
        const result = await notion.appendBlocks(pageId, [block]);
        spinner.success('Heading added');
        if (globalFlags.json) output.json(result);
        return;
      } catch (error) {
        spinner.fail('Failed to add heading');
        throw error;
      }
    }

    // Add a todo
    if (flags.todo) {
      const spinner = output.spinner('Adding todo...');
      try {
        const block = notion.createTodoBlock(flags.todo as string);
        const result = await notion.appendBlocks(pageId, [block]);
        spinner.success('Todo added');
        if (globalFlags.json) output.json(result);
        return;
      } catch (error) {
        spinner.fail('Failed to add todo');
        throw error;
      }
    }

    // Add a bullet
    if (flags.bullet) {
      const spinner = output.spinner('Adding bullet point...');
      try {
        const block = notion.createBulletBlock(flags.bullet as string);
        const result = await notion.appendBlocks(pageId, [block]);
        spinner.success('Bullet point added');
        if (globalFlags.json) output.json(result);
        return;
      } catch (error) {
        spinner.fail('Failed to add bullet');
        throw error;
      }
    }

    // List blocks (default action)
    const spinner = output.spinner('Fetching blocks...');
    try {
      const blocks = await notion.getPageContent(pageId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(blocks);
        return;
      }

      if (blocks.length === 0) {
        output.info('No content blocks found.');
        return;
      }

      output.info(`Content blocks (${blocks.length}):\n`);
      for (const block of blocks) {
        const text = notion.extractBlockText(block);
        const prefix = block.type === 'to_do' ? '[ ] ' :
                       block.type === 'bulleted_list_item' ? '• ' :
                       block.type.startsWith('heading') ? '# ' : '';
        output.info(`  [${block.type}] ${prefix}${text || '(empty)'}`);
        output.info(`    ID: ${block.id}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch blocks');
      throw error;
    }
  },
};
