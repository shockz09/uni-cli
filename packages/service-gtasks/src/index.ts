/**
 * Google Tasks Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { commands } from './commands';
import { gtasks } from './api';

const gtasksService: UniService = {
  name: 'gtasks',
  description: 'Google Tasks - manage todos',
  version: '0.1.0',

  commands: commands,

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gtasks', gtasks),
};

export default gtasksService;
