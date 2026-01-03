/**
 * uni gmeet auth - Authenticate with Google Meet
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmeet } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Google Meet',
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
    'uni gmeet auth',
    'uni gmeet auth --status',
    'uni gmeet auth --logout',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.logout) {
      gmeet.clearTokens();
      output.success('Logged out from Google Meet');
      if (globalFlags.json) {
        output.json({ status: 'logged_out' });
      }
      return;
    }

    if (flags.status) {
      const authenticated = gmeet.isAuthenticated();
      const hasCredentials = gmeet.hasCredentials();

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
        output.success('Authenticated with Google Meet');
      } else {
        output.warn('Not authenticated. Run "uni gmeet auth"');
      }
      return;
    }

    // Authenticate
    if (!gmeet.hasCredentials()) {
      output.error('Google credentials not configured');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      return;
    }

    output.info('Starting authentication...');

    try {
      await gmeet.authenticate();
      output.success('Authenticated with Google Meet!');
      if (globalFlags.json) {
        output.json({ status: 'authenticated' });
      }
    } catch (error) {
      output.error('Authentication failed');
      throw error;
    }
  },
};
