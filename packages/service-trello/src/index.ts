/**
 * Trello Service - Boards, lists, cards, and members
 *
 * Commands:
 *   boards   - List, create, close boards
 *   lists    - List, create, archive lists
 *   cards    - List, create, move, archive, delete cards
 *   members  - List board members
 *
 * Requires: TRELLO_API_KEY and TRELLO_TOKEN environment variables
 * Get your credentials from: https://trello.com/power-ups/admin
 */

import type { UniService } from '@uni/shared';
import { c } from '@uni/shared';
import { boardsCommand } from './commands/boards';
import { listsCommand } from './commands/lists';
import { cardsCommand } from './commands/cards';
import { membersCommand } from './commands/members';
import { trello } from './api';

const trelloService: UniService = {
  name: 'trello',
  description: 'Trello - boards, lists, cards, and members',
  version: '0.1.0',

  commands: [boardsCommand, listsCommand, cardsCommand, membersCommand],

  auth: {
    type: 'token',
    envVar: 'TRELLO_API_KEY',
    flow: 'manual',
  },

  async setup() {
    if (!trello.hasCredentials()) {
      console.error(c.yellow('Warning: TRELLO_API_KEY and TRELLO_TOKEN not set.'));
      console.error(c.dim('Get your credentials from https://trello.com/power-ups/admin'));
    }
  },
};

export default trelloService;
