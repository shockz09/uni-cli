/**
 * uni notion databases - Database commands
 */

import type { Command, CommandContext } from '@uni/shared';
import { notion } from '../api';

const listCommand: Command = {
  name: 'list',
  description: 'List databases',
  aliases: ['ls'],
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Maximum databases',
      default: 20,
    },
  ],
  examples: [
    'uni notion databases list',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!notion.hasToken()) {
      output.error('Notion token not configured.');
      return;
    }

    const spinner = output.spinner('Fetching databases...');

    try {
      const databases = await notion.listDatabases(flags.limit as number);
      spinner.success(`Found ${databases.length} databases`);

      if (globalFlags.json) {
        output.json(databases);
        return;
      }

      if (databases.length === 0) {
        output.info('No databases found (make sure they are shared with your integration)');
        return;
      }

      console.log('');
      for (const db of databases) {
        const title = db.title?.[0]?.plain_text || 'Untitled';
        console.log(`📊 \x1b[1m${title}\x1b[0m`);
        console.log(`   \x1b[36m${db.url}\x1b[0m`);
        if (db.description?.[0]?.plain_text) {
          console.log(`   \x1b[90m${db.description[0].plain_text}\x1b[0m`);
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch databases');
      throw error;
    }
  },
};

const queryCommand: Command = {
  name: 'query',
  description: 'Query a database',
  aliases: ['q'],
  args: [
    {
      name: 'database',
      description: 'Database ID',
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
    'uni notion databases query abc123',
    'uni notion databases query abc123 --limit 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!notion.hasToken()) {
      output.error('Notion token not configured.');
      return;
    }

    let dbId = args.database;

    // Extract ID from URL if needed
    if (dbId.includes('notion.so')) {
      const match = dbId.match(/([a-f0-9]{32})/);
      if (match) dbId = match[1];
    }

    const spinner = output.spinner('Querying database...');

    try {
      const pages = await notion.queryDatabase(dbId, {
        pageSize: flags.limit as number,
      });

      spinner.success(`Found ${pages.length} items`);

      if (globalFlags.json) {
        output.json(pages);
        return;
      }

      if (pages.length === 0) {
        output.info('No items in database');
        return;
      }

      console.log('');
      for (const page of pages) {
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

        console.log(`📄 \x1b[1m${title}\x1b[0m`);
        console.log(`   \x1b[36m${page.url}\x1b[0m`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to query database');
      throw error;
    }
  },
};

export const databasesCommand: Command = {
  name: 'databases',
  description: 'Manage databases',
  aliases: ['db', 'dbs'],
  subcommands: [listCommand, queryCommand],
  examples: [
    'uni notion databases list',
    'uni notion databases query abc123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    await listCommand.handler(ctx);
  },
};
