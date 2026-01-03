/**
 * Gmail Service - Email management
 *
 * Commands:
 *   list   - List emails
 *   read   - Read an email
 *   send   - Send an email
 *   auth   - Authenticate
 *
 * Uses same Google credentials as gcal:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 */

import type { UniService } from '@uni/shared';
import { listCommand } from './commands/list';
import { readCommand } from './commands/read';
import { sendCommand } from './commands/send';
import { authCommand } from './commands/auth';
import { gmail } from './api';

const gmailService: UniService = {
  name: 'gmail',
  description: 'Gmail - read, send, and search emails',
  version: '0.1.0',

  commands: [listCommand, readCommand, sendCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  async setup() {
    if (!gmail.hasCredentials()) {
      console.error('\x1b[33mWarning: Google credentials not configured.\x1b[0m');
    } else if (!gmail.isAuthenticated()) {
      console.error('\x1b[33mWarning: Not authenticated. Run "uni gmail auth".\x1b[0m');
    }
  },
};

export default gmailService;
