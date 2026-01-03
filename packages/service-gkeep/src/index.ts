/**
 * Google Keep Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { addCommand } from './commands/add';
import { deleteCommand } from './commands/delete';
import { authCommand } from './commands/auth';
import { gkeep } from './api';

const gkeepService: UniService = {
  name: 'gkeep',
  description: 'Google Keep - notes',
  version: '0.1.0',

  commands: [listCommand, getCommand, addCommand, deleteCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gkeep', gkeep),
};

export default gkeepService;
