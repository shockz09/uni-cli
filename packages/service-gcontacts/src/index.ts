/**
 * Google Contacts Service
 */

import type { UniService } from '@uni/shared';
import { listCommand } from './commands/list';
import { searchCommand } from './commands/search';
import { getCommand } from './commands/get';
import { addCommand } from './commands/add';
import { deleteCommand } from './commands/delete';
import { authCommand } from './commands/auth';
import { gcontacts } from './api';

const gcontactsService: UniService = {
  name: 'gcontacts',
  description: 'Google Contacts - manage contacts',
  version: '0.1.0',

  commands: [listCommand, searchCommand, getCommand, addCommand, deleteCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  async setup() {
    if (!gcontacts.hasCredentials()) {
      console.error('\x1b[33mWarning: Google credentials not set.\x1b[0m');
    } else if (!gcontacts.isAuthenticated()) {
      console.error('\x1b[33mWarning: Run "uni gcontacts auth".\x1b[0m');
    }
  },
};

export default gcontactsService;
