/**
 * Google Meet Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { createCommand } from './commands/create';
import { scheduleCommand } from './commands/schedule';
import { listCommand } from './commands/list';
import { deleteCommand } from './commands/delete';
import { authCommand } from './commands/auth';
// New commands
import { getCommand } from './commands/get';
import { updateCommand } from './commands/update';
import { inviteCommand } from './commands/invite';
import { gmeet } from './api';

const gmeetService: UniService = {
  name: 'gmeet',
  description: 'Google Meet - video meetings',
  version: '0.1.0',

  commands: [
    createCommand,
    scheduleCommand,
    listCommand,
    deleteCommand,
    // New commands
    getCommand,
    updateCommand,
    inviteCommand,
    authCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gmeet', gmeet),
};

export default gmeetService;
