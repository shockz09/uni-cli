/**
 * Google Forms Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { commands } from './commands';
import { gforms } from './api';

const gformsService: UniService = {
  name: 'gforms',
  description: 'Google Forms - surveys and forms',
  version: '0.1.0',

  commands: commands,

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gforms', gforms),
};

export default gformsService;
