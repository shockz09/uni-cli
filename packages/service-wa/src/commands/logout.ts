/**
 * uni wa logout - Clear WhatsApp session
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { deleteSession, isAuthenticated } from '../client';

export const logoutCommand: Command = {
  name: 'logout',
  description: 'Clear WhatsApp session',
  examples: [
    'uni wa logout',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    if (!isAuthenticated()) {
      console.log(c.dim('Not authenticated with WhatsApp.'));
      return;
    }

    const deleted = deleteSession();
    if (deleted) {
      console.log(c.green('Successfully logged out from WhatsApp.'));
    } else {
      console.log(c.dim('Session already cleared.'));
    }
  },
};
