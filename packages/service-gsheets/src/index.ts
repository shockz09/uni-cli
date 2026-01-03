/**
 * Google Sheets Service
 */

import type { UniService } from '@uni/shared';
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { createCommand } from './commands/create';
import { setCommand } from './commands/set';
import { appendCommand } from './commands/append';
import { shareCommand } from './commands/share';
import { authCommand } from './commands/auth';
import { gsheets } from './api';

const gsheetsService: UniService = {
  name: 'gsheets',
  description: 'Google Sheets - spreadsheets',
  version: '0.1.0',

  commands: [listCommand, getCommand, createCommand, setCommand, appendCommand, shareCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  async setup() {
    if (!gsheets.hasCredentials()) {
      console.error('\x1b[33mWarning: Google credentials not set.\x1b[0m');
    } else if (!gsheets.isAuthenticated()) {
      console.error('\x1b[33mWarning: Run "uni gsheets auth".\x1b[0m');
    }
  },
};

export default gsheetsService;
