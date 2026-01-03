/**
 * Google Forms Service
 */

import type { UniService } from '@uni/shared';
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { createCommand } from './commands/create';
import { addQuestionCommand } from './commands/add-question';
import { responsesCommand } from './commands/responses';
import { shareCommand } from './commands/share';
import { deleteCommand } from './commands/delete';
import { authCommand } from './commands/auth';
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
    authCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  async setup() {
    if (!gforms.hasCredentials()) {
      console.error('\x1b[33mWarning: Google credentials not set.\x1b[0m');
    } else if (!gforms.isAuthenticated()) {
      console.error('\x1b[33mWarning: Run "uni gforms auth".\x1b[0m');
    }
  },
};

export default gformsService;
