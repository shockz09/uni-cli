/**
 * Google Tasks Service
 */

import type { UniService } from '@uni/shared';
import { listCommand } from './commands/list';
import { addCommand } from './commands/add';
import { doneCommand } from './commands/done';
import { deleteCommand } from './commands/delete';
import { listsCommand } from './commands/lists';
import { authCommand } from './commands/auth';
import { gtasks } from './api';

const gtasksService: UniService = {
  name: 'gtasks',
  description: 'Google Tasks - manage todos',
  version: '0.1.0',

  commands: [listCommand, addCommand, doneCommand, deleteCommand, listsCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  async setup() {
    if (!gtasks.hasCredentials()) {
      console.error('\x1b[33mWarning: Google credentials not set.\x1b[0m');
    } else if (!gtasks.isAuthenticated()) {
      console.error('\x1b[33mWarning: Run "uni gtasks auth".\x1b[0m');
    }
  },
};

export default gtasksService;
