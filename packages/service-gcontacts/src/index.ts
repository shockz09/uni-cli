/**
 * Google Contacts Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { commands } from './commands';
import { gcontacts } from './api';

const gcontactsService: UniService = {
  name: 'gcontacts',
  description: 'Google Contacts - manage contacts',
  version: '0.1.0',

  commands: commands,

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gcontacts', gcontacts),
};

export default gcontactsService;
