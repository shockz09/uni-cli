/**
 * Google Drive Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { listCommand } from './commands/list';
import { searchCommand } from './commands/search';
import { getCommand } from './commands/get';
import { uploadCommand } from './commands/upload';
import { downloadCommand } from './commands/download';
import { shareCommand } from './commands/share';
import { deleteCommand } from './commands/delete';
import { authCommand } from './commands/auth';
// New commands
import { mkdirCommand } from './commands/mkdir';
import { moveCommand } from './commands/move';
import { copyCommand } from './commands/copy';
import { renameCommand } from './commands/rename';
import { trashCommand } from './commands/trash';
import { permissionsCommand } from './commands/permissions';
import { gdrive } from './api';

const gdriveService: UniService = {
  name: 'gdrive',
  description: 'Google Drive - files and search',
  version: '0.1.0',

  commands: [
    listCommand,
    searchCommand,
    getCommand,
    uploadCommand,
    downloadCommand,
    shareCommand,
    deleteCommand,
    // New commands
    mkdirCommand,
    moveCommand,
    copyCommand,
    renameCommand,
    trashCommand,
    permissionsCommand,
    authCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gdrive', gdrive),
};

export default gdriveService;
