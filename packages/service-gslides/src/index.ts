/**
 * Google Slides Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { commands, authCommand } from './commands';
import { gslides } from './api';

const gslidesService: UniService = {
  name: 'gslides',
  description: 'Google Slides - presentations',
  version: '0.1.0',

  commands: commands,

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gslides', gslides),
};

export default gslidesService;
