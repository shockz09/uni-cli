/**
 * Google Slides Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
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

  setup: createGoogleServiceSetup('gslides', gslides),
};

export default gslidesService;
