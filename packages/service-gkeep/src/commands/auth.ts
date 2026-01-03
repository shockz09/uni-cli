/**
 * uni gkeep auth - Authenticate with Google
 */

import type { Command, CommandContext } from '@uni/shared';
import { gkeep } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Google Keep',
  options: [
    {
      name: 'status',
      short: 's',
      type: 'boolean',
      description: 'Check authentication status',
    },
    {
      name: 'logout',
      type: 'boolean',
      description: 'Remove saved authentication',
    },
  ],
  examples: ['uni gkeep auth', 'uni gkeep auth --status', 'uni gkeep auth --logout'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.status) {
      const authenticated = gkeep.isAuthenticated();
      const hasCredentials = gkeep.hasCredentials();

      if (globalFlags.json) {
        output.json({ authenticated, hasCredentials });
        return;
      }

      if (!hasCredentials) {
        output.error('Google credentials not configured.');
        output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
        return;
      }

      if (authenticated) {
        output.success('Authenticated with Google Keep');
      } else {
        output.warn('Not authenticated. Run "uni gkeep auth" to login.');
      }
      return;
    }

    if (flags.logout) {
      gkeep.logout();

      if (globalFlags.json) {
        output.json({ loggedOut: true });
        return;
      }

      output.success('Logged out from Google Keep');
      return;
    }

    if (!gkeep.hasCredentials()) {
      output.error('Google credentials not configured.');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      return;
    }

    output.info('Starting Google authentication...');

    try {
      await gkeep.authenticate();
      output.success('Successfully authenticated with Google Keep!');
    } catch (error) {
      output.error(`Authentication failed: ${error}`);
    }
  },
};
