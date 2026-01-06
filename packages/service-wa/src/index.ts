/**
 * WhatsApp Service - Uses Baileys with daemon architecture
 */

import type { Service } from '@uni/shared';
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
import { statusCommand } from './commands/status';
import { stopCommand } from './commands/stop';

export const service: Service = {
  name: 'wa',
  description: 'WhatsApp messaging (Baileys)',
  commands: [
    authCommand,
    logoutCommand,
    statusCommand,
    stopCommand,
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
