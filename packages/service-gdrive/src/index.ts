/**
 * Google Drive Service
 */

import type { UniService } from '@uni/shared';
import { listCommand } from './commands/list';
import { searchCommand } from './commands/search';
import { getCommand } from './commands/get';
import { uploadCommand } from './commands/upload';
import { downloadCommand } from './commands/download';
import { shareCommand } from './commands/share';
import { deleteCommand } from './commands/delete';
import { authCommand } from './commands/auth';
import { gdrive } from './api';

const gdriveService: UniService = {
  name: 'gdrive',
  description: 'Google Drive - files and search',
  version: '0.1.0',

  commands: [listCommand, searchCommand, getCommand, uploadCommand, downloadCommand, shareCommand, deleteCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  async setup() {
    if (!gdrive.hasCredentials()) {
      console.error('\x1b[33mWarning: Google credentials not set.\x1b[0m');
    } else if (!gdrive.isAuthenticated()) {
      console.error('\x1b[33mWarning: Run "uni gdrive auth".\x1b[0m');
    }
  },
};

export default gdriveService;
