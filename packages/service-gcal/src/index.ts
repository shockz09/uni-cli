/**
 * Google Calendar Service - Event management
 *
 * Commands:
 *   list   - List calendar events
 *   add    - Create a new event
 *   next   - Show next upcoming event
 *   auth   - Authenticate with Google
 *
 * Requires Google OAuth credentials:
 *   GOOGLE_CLIENT_ID - OAuth client ID
 *   GOOGLE_CLIENT_SECRET - OAuth client secret
 *
 * Create credentials at: https://console.cloud.google.com/apis/credentials
 */

import type { UniService } from '@uni/shared';
import { listCommand } from './commands/list';
import { addCommand } from './commands/add';
import { nextCommand } from './commands/next';
import { authCommand } from './commands/auth';
import { gcal } from './api';

const gcalService: UniService = {
  name: 'gcal',
  description: 'Google Calendar - events and scheduling',
  version: '0.1.0',

  commands: [listCommand, addCommand, nextCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  async setup() {
    if (!gcal.hasCredentials()) {
      console.error('\x1b[33mWarning: Google Calendar credentials not configured.\x1b[0m');
      console.error('\x1b[33mSet GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.\x1b[0m');
    } else if (!gcal.isAuthenticated()) {
      console.error('\x1b[33mWarning: Not authenticated. Run "uni gcal auth" to login.\x1b[0m');
    }
  },
};

export default gcalService;
