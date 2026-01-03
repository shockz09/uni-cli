/**
 * Notion Service - Pages, databases, and search
 *
 * Commands:
 *   search     - Search pages and databases
 *   pages      - View and manage pages
 *   databases  - List and query databases
 *
 * Requires: NOTION_TOKEN environment variable
 * Create integration: https://www.notion.so/my-integrations
 */

import type { UniService } from '@uni/shared';
import { c } from '@uni/shared';
import { searchCommand } from './commands/search';
import { pagesCommand } from './commands/pages';
import { databasesCommand } from './commands/databases';
import { notion } from './api';

const notionService: UniService = {
  name: 'notion',
  description: 'Notion - pages, databases, and search',
  version: '0.1.0',

  commands: [searchCommand, pagesCommand, databasesCommand],

  auth: {
    type: 'token',
    envVar: 'NOTION_TOKEN',
    flow: 'manual',
  },

  async setup() {
    if (!notion.hasToken()) {
      console.error(c.yellow('Warning: NOTION_TOKEN not set.'));
    }
  },
};

export default notionService;
