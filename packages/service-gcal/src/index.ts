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
import { createGoogleServiceSetup } from '@uni/shared';
import { listCommand } from './commands/list';
import { addCommand } from './commands/add';
import { nextCommand } from './commands/next';
import { updateCommand } from './commands/update';
import { deleteCommand } from './commands/delete';
import { authCommand } from './commands/auth';
import { gcal } from './api';

const gcalService: UniService = {
  name: 'gcal',
  description: 'Google Calendar - events and scheduling',
  version: '0.1.0',

  commands: [listCommand, addCommand, nextCommand, updateCommand, deleteCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gcal', gcal),
};

export default gcalService;
