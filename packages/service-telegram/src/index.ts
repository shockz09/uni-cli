/**
 * Telegram Service - User API via MTProto (gramjs)
 */

import type { UniService } from '@uni/shared';
import { authCommand } from './commands/auth';
import { logoutCommand } from './commands/logout';
import { chatsCommand } from './commands/chats';
import { readCommand } from './commands/read';
import { sendCommand } from './commands/send';
import { editCommand } from './commands/edit';
import { deleteCommand } from './commands/delete';
import { forwardCommand } from './commands/forward';
import { reactCommand } from './commands/react';
import { searchCommand } from './commands/search';
import { contactsCommand } from './commands/contacts';
import { downloadCommand } from './commands/download';

const telegramService: UniService = {
  name: 'telegram',
  description: 'Telegram user API (MTProto)',
  version: '0.1.0',

  commands: [
    authCommand,
    logoutCommand,
    chatsCommand,
    readCommand,
    sendCommand,
    editCommand,
    deleteCommand,
    forwardCommand,
    reactCommand,
    searchCommand,
    contactsCommand,
    downloadCommand,
  ],
};

export default telegramService;
