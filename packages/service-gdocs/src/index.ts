/**
 * Google Docs Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { commands, authCommand } from './commands';
import { gdocs } from './api';

const gdocsService: UniService = {
  name: 'gdocs',
  description: 'Google Docs - documents',
  version: '0.1.0',

  commands: [...commands, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gdocs', gdocs),
};

export default gdocsService;
