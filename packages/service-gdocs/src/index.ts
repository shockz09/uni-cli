/**
 * Google Docs Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { createCommand } from './commands/create';
import { appendCommand } from './commands/append';
import { replaceCommand } from './commands/replace';
import { insertCommand } from './commands/insert';
import { findCommand } from './commands/find';
import { clearCommand } from './commands/clear';
import { importCommand } from './commands/import';
import { shareCommand } from './commands/share';
import { exportCommand } from './commands/export';
import { deleteCommand } from './commands/delete';
import { renameCommand } from './commands/rename';
import { authCommand } from './commands/auth';
import { gdocs } from './api';

const gdocsService: UniService = {
  name: 'gdocs',
  description: 'Google Docs - documents',
  version: '0.1.0',

  commands: [
    listCommand,
    getCommand,
    createCommand,
    appendCommand,
    replaceCommand,
    insertCommand,
    findCommand,
    clearCommand,
    importCommand,
    shareCommand,
    exportCommand,
    deleteCommand,
    renameCommand,
    authCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gdocs', gdocs),
};

export default gdocsService;
