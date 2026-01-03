/**
 * Google Docs Service
 */

import type { UniService } from '@uni/shared';
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { createCommand } from './commands/create';
import { appendCommand } from './commands/append';
import { replaceCommand } from './commands/replace';
import { shareCommand } from './commands/share';
import { exportCommand } from './commands/export';
import { authCommand } from './commands/auth';
import { gdocs } from './api';

const gdocsService: UniService = {
  name: 'gdocs',
  description: 'Google Docs - documents',
  version: '0.1.0',

  commands: [listCommand, getCommand, createCommand, appendCommand, replaceCommand, shareCommand, exportCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  async setup() {
    if (!gdocs.hasCredentials()) {
      console.error('\x1b[33mWarning: Google credentials not set.\x1b[0m');
    } else if (!gdocs.isAuthenticated()) {
      console.error('\x1b[33mWarning: Run "uni gdocs auth".\x1b[0m');
    }
  },
};

export default gdocsService;
