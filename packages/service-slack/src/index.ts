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
import { c } from '@uni/shared';
import { channelsCommand } from './commands/channels';
import { messagesCommand } from './commands/messages';
import { sendCommand } from './commands/send';
import { usersCommand } from './commands/users';
import { threadsCommand } from './commands/threads';
import { reactionsCommand } from './commands/reactions';
import { pinsCommand } from './commands/pins';
import { searchCommand } from './commands/search';
import { scheduleCommand } from './commands/schedule';
import { slack } from './api';

const slackService: UniService = {
  name: 'slack',
  description: 'Slack messaging - channels, messages, users',
  version: '0.1.0',

  commands: [
    channelsCommand,
    messagesCommand,
    sendCommand,
    usersCommand,
    threadsCommand,
    reactionsCommand,
    pinsCommand,
    searchCommand,
    scheduleCommand,
  ],

  auth: {
    type: 'token',
    envVar: 'SLACK_BOT_TOKEN',
    flow: 'manual',
  },

  async setup() {
    if (process.env.UNI_SKIP_SETUP_WARNINGS) return;
    if (!slack.hasToken()) {
      console.error(c.yellow('Warning: SLACK_BOT_TOKEN not set.'));
    }
  },
};

export default slackService;
