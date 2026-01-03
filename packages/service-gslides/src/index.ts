/**
 * Google Slides Service
 */

import type { UniService } from '@uni/shared';
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { createCommand } from './commands/create';
import { addSlideCommand } from './commands/add-slide';
import { addTextCommand } from './commands/add-text';
import { shareCommand } from './commands/share';
import { exportCommand } from './commands/export';
import { authCommand } from './commands/auth';
import { gslides } from './api';

const gslidesService: UniService = {
  name: 'gslides',
  description: 'Google Slides - presentations',
  version: '0.1.0',

  commands: [
    listCommand,
    getCommand,
    createCommand,
    addSlideCommand,
    addTextCommand,
    shareCommand,
    exportCommand,
    authCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  async setup() {
    if (!gslides.hasCredentials()) {
      console.error('\x1b[33mWarning: Google credentials not set.\x1b[0m');
    } else if (!gslides.isAuthenticated()) {
      console.error('\x1b[33mWarning: Run "uni gslides auth".\x1b[0m');
    }
  },
};

export default gslidesService;
