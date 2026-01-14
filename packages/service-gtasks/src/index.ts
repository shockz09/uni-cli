/**
 * Google Tasks Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { listCommand } from './commands/list';
import { addCommand } from './commands/add';
import { updateCommand } from './commands/update';
import { doneCommand } from './commands/done';
import { undoneCommand } from './commands/undone';
import { deleteCommand } from './commands/delete';
import { listsCommand } from './commands/lists';
import { authCommand } from './commands/auth';
// New commands
import { moveCommand } from './commands/move';
import { clearCommand } from './commands/clear';
import { subtaskCommand } from './commands/subtask';
import { getCommand } from './commands/get';
import { gtasks } from './api';

const gtasksService: UniService = {
  name: 'gtasks',
  description: 'Google Tasks - manage todos',
  version: '0.1.0',

  commands: [
    listCommand,
    addCommand,
    updateCommand,
    doneCommand,
    undoneCommand,
    deleteCommand,
    listsCommand,
    // New commands
    moveCommand,
    clearCommand,
    subtaskCommand,
    getCommand,
    authCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gtasks', gtasks),
};

export default gtasksService;
