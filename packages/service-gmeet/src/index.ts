/**
 * Google Meet Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { commands } from './commands';
import { gmeet } from './api';

const gmeetService: UniService = {
  name: 'gmeet',
  description: 'Google Meet - video meetings',
  version: '0.1.0',

  commands: commands,

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gmeet', gmeet),
};

export default gmeetService;
