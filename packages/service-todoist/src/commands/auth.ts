/**
 * uni todoist auth - Authenticate with Todoist
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { todoistOAuth } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Todoist',
  options: [
    { name: 'status', short: 's', type: 'boolean', description: 'Check auth status' },
    { name: 'logout', type: 'boolean', description: 'Clear authentication' },
  ],
  examples: [
    'uni todoist auth',
    'uni todoist auth --status',
    'uni todoist auth --logout',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags } = ctx;

    if (flags.status) {
      if (todoistOAuth.isAuthenticated()) {
        console.log(c.green('✓') + ' Authenticated with Todoist');
      } else {
        console.log(c.yellow('○') + ' Not authenticated. Run "uni todoist auth" to authenticate.');
      }
      return;
    }

    if (flags.logout) {
      todoistOAuth.logout();
      console.log(c.green('✓') + ' Logged out from Todoist');
      return;
    }

    if (todoistOAuth.isAuthenticated()) {
      console.log(c.green('✓') + ' Already authenticated with Todoist');
      console.log(c.dim('Use --logout to sign out, or --status to check.'));
      return;
    }

    const spinner = output.spinner('Opening browser for authentication...');

    try {
      await todoistOAuth.authenticate();
      spinner.success('Authenticated with Todoist');
    } catch (error) {
      spinner.fail('Authentication failed');
      throw error;
    }
  },
};
