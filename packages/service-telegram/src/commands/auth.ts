/**
 * uni telegram auth - Interactive authentication
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import {
  getCredentials,
  authenticateInteractive,
  saveSession,
  isAuthenticated,
} from '../client';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Telegram (phone + OTP)',
  examples: [
    'uni telegram auth',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output } = ctx;

    // Check if already authenticated
    if (isAuthenticated()) {
      console.log('');
      console.log(c.cyan('Already authenticated with Telegram.'));
      console.log(c.dim('Use `uni telegram logout` to clear session and re-authenticate.'));
      console.log('');
      return;
    }

    // Get credentials (uses embedded defaults)
    const creds = getCredentials();

    console.log('');
    console.log(c.bold('Telegram Authentication'));
    console.log(c.dim('You will receive an OTP code via Telegram.'));
    console.log('');

    try {
      const sessionString = await authenticateInteractive(creds.apiId, creds.apiHash);

      if (sessionString) {
        saveSession(sessionString);
        console.log('');
        console.log(c.green('✓ Successfully authenticated!'));
        console.log(c.dim(`Session saved to ~/.uni/tokens/telegram.session`));
        console.log('');
      } else {
        output.error('Authentication failed.');
      }
    } catch (error) {
      output.error(`Authentication failed: ${(error as Error).message}`);
    }
  },
};
