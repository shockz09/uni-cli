/**
 * uni telegram logout - Clear session
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { deleteSession, isAuthenticated } from '../client';

export const logoutCommand: Command = {
  name: 'logout',
  description: 'Clear Telegram session',
  examples: ['uni telegram logout'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output } = ctx;

    if (!isAuthenticated()) {
      console.log('');
      console.log(c.dim('Not currently authenticated with Telegram.'));
      console.log('');
      return;
    }

    const deleted = deleteSession();

    console.log('');
    if (deleted) {
      console.log(c.green('✓ Telegram session cleared.'));
      console.log(c.dim('Run `uni telegram auth` to authenticate again.'));
    } else {
      output.error('Failed to clear session.');
    }
    console.log('');
  },
};
