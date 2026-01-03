/**
 * Slack Service - Messaging and channels
 *
 * Commands:
 *   channels  - List and manage channels
 *   messages  - Read channel messages
 *   send      - Send messages
 *   users     - List and view users
 *
 * Requires: SLACK_BOT_TOKEN environment variable
 * Get token: https://api.slack.com/apps → Create App → Bot Token
 */

import type { UniService } from '@uni/shared';
import { channelsCommand } from './commands/channels';
import { messagesCommand } from './commands/messages';
import { sendCommand } from './commands/send';
import { usersCommand } from './commands/users';
import { slack } from './api';

const slackService: UniService = {
  name: 'slack',
  description: 'Slack messaging - channels, messages, users',
  version: '0.1.0',

  commands: [channelsCommand, messagesCommand, sendCommand, usersCommand],

  auth: {
    type: 'token',
    envVar: 'SLACK_BOT_TOKEN',
    flow: 'manual',
  },

  async setup() {
    if (!slack.hasToken()) {
      console.error('\x1b[33mWarning: SLACK_BOT_TOKEN not set.\x1b[0m');
    }
  },
};

export default slackService;
