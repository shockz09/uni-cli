/**
 * uni linear auth - Authenticate with Linear
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { linearOAuth } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Linear',
  options: [
    { name: 'status', short: 's', type: 'boolean', description: 'Check auth status' },
    { name: 'logout', type: 'boolean', description: 'Clear authentication' },
  ],
  examples: [
    'uni linear auth',
    'uni linear auth --status',
    'uni linear auth --logout',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags } = ctx;

    if (flags.status) {
      if (linearOAuth.isAuthenticated()) {
        console.log(c.green('✓') + ' Authenticated with Linear');
      } else {
        console.log(c.yellow('○') + ' Not authenticated. Run "uni linear auth" to authenticate.');
      }
      return;
    }

    if (flags.logout) {
      linearOAuth.logout();
      console.log(c.green('✓') + ' Logged out from Linear');
      return;
    }

    if (linearOAuth.isAuthenticated()) {
      console.log(c.green('✓') + ' Already authenticated with Linear');
      console.log(c.dim('Use --logout to sign out, or --status to check.'));
      return;
    }

    const spinner = output.spinner('Opening browser for authentication...');

    try {
      await linearOAuth.authenticate();
      spinner.success('Authenticated with Linear');
    } catch (error) {
      spinner.fail('Authentication failed');
      throw error;
    }
  },
};
