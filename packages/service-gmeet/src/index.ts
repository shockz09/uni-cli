/**
 * Google Meet Service
 */

import type { UniService } from '@uni/shared';
import { createCommand } from './commands/create';
import { scheduleCommand } from './commands/schedule';
import { listCommand } from './commands/list';
import { authCommand } from './commands/auth';
import { gmeet } from './api';

const gmeetService: UniService = {
  name: 'gmeet',
  description: 'Google Meet - video meetings',
  version: '0.1.0',

  commands: [createCommand, scheduleCommand, listCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  async setup() {
    if (!gmeet.hasCredentials()) {
      console.error('\x1b[33mWarning: Google credentials not set.\x1b[0m');
    } else if (!gmeet.isAuthenticated()) {
      console.error('\x1b[33mWarning: Run "uni gmeet auth".\x1b[0m');
    }
  },
};

export default gmeetService;
