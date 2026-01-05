/**
 * Gmail Service - Email management
 *
 * Commands:
 *   list   - List emails
 *   read   - Read an email
 *   search - Search emails (full-text)
 *   send   - Send an email
 *   auth   - Authenticate
 *
 * Uses same Google credentials as gcal:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { listCommand } from './commands/list';
import { readCommand } from './commands/read';
import { searchCommand } from './commands/search';
import { sendCommand } from './commands/send';
import { deleteCommand } from './commands/delete';
import { authCommand } from './commands/auth';
import { gmail } from './api';

const gmailService: UniService = {
  name: 'gmail',
  description: 'Gmail - read, send, and search emails',
  version: '0.1.0',

  commands: [listCommand, readCommand, searchCommand, sendCommand, deleteCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gmail', gmail),
};

export default gmailService;
