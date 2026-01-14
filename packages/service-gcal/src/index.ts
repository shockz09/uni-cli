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
// New commands
import { calendarsCommand } from './commands/calendars';
import { quickCommand } from './commands/quick';
import { freebusyCommand } from './commands/freebusy';
import { getCommand } from './commands/get';
import { moveCommand } from './commands/move';
import { inviteCommand } from './commands/invite';
import { recurringCommand } from './commands/recurring';
import { remindCommand } from './commands/remind';
import { gcal } from './api';

const gcalService: UniService = {
  name: 'gcal',
  description: 'Google Calendar - events and scheduling',
  version: '0.1.0',

  commands: [
    listCommand,
    addCommand,
    nextCommand,
    updateCommand,
    deleteCommand,
    // New commands
    calendarsCommand,
    quickCommand,
    freebusyCommand,
    getCommand,
    moveCommand,
    inviteCommand,
    recurringCommand,
    remindCommand,
    authCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gcal', gcal),
};

export default gcalService;
