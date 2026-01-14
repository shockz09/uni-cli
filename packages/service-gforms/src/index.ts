/**
 * Google Forms Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { createCommand } from './commands/create';
import { addQuestionCommand } from './commands/add-question';
import { responsesCommand } from './commands/responses';
import { shareCommand } from './commands/share';
import { deleteCommand } from './commands/delete';
import { authCommand } from './commands/auth';
// New commands
import { updateCommand } from './commands/update';
import { linkCommand } from './commands/link';
import { exportCommand } from './commands/export';
import { gforms } from './api';

const gformsService: UniService = {
  name: 'gforms',
  description: 'Google Forms - surveys and forms',
  version: '0.1.0',

  commands: [
    listCommand,
    getCommand,
    createCommand,
    addQuestionCommand,
    responsesCommand,
    shareCommand,
    deleteCommand,
    // New commands
    updateCommand,
    linkCommand,
    exportCommand,
    authCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gforms', gforms),
};

export default gformsService;
