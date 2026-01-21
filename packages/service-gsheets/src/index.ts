/**
 * Google Sheets Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { commands } from './commands';
import { gsheets } from './api';

const gsheetsService: UniService = {
  name: 'gsheets',
  description: 'Google Sheets - spreadsheets',
  version: '0.1.0',

  commands,

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gsheets', gsheets),
};

export default gsheetsService;
