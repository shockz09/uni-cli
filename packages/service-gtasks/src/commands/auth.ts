/**
 * uni gtasks auth - Authenticate with Google Tasks
 */

import type { Command, CommandContext } from '@uni/shared';
import { gtasks } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Google Tasks',
  aliases: ['login'],
  options: [
    {
      name: 'status',
      short: 's',
      type: 'boolean',
      description: 'Check authentication status',
      default: false,
    },
    {
      name: 'logout',
      type: 'boolean',
      description: 'Remove saved credentials',
      default: false,
    },
  ],
  examples: [
    'uni gtasks auth',
    'uni gtasks auth --status',
    'uni gtasks auth --logout',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.logout) {
      gtasks.clearTokens();
      output.success('Logged out from Google Tasks');
      if (globalFlags.json) {
        output.json({ status: 'logged_out' });
      }
      return;
    }

    if (flags.status) {
      const authenticated = gtasks.isAuthenticated();
      const hasCredentials = gtasks.hasCredentials();

      if (globalFlags.json) {
        output.json({ authenticated, hasCredentials });
        return;
      }

      if (!hasCredentials) {
        output.error('Google credentials not configured');
        output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
        return;
      }

      if (authenticated) {
        output.success('Authenticated with Google Tasks');
      } else {
        output.warn('Not authenticated. Run "uni gtasks auth"');
      }
      return;
    }

    // Authenticate
    if (!gtasks.hasCredentials()) {
      output.error('Google credentials not configured');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      return;
    }

    output.info('Starting authentication...');

    try {
      await gtasks.authenticate();
      output.success('Authenticated with Google Tasks!');
      if (globalFlags.json) {
        output.json({ status: 'authenticated' });
      }
    } catch (error) {
      output.error('Authentication failed');
      throw error;
    }
  },
};
