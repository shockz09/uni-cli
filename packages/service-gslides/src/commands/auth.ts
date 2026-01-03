/**
 * uni gslides auth - Authenticate with Google
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Google Slides',
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
  examples: ['uni gslides auth', 'uni gslides auth --status', 'uni gslides auth --logout'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.status) {
      const authenticated = gslides.isAuthenticated();
      const hasCredentials = gslides.hasCredentials();

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
        output.success('Authenticated with Google Slides');
      } else {
        output.warn('Not authenticated. Run "uni gslides auth" to login.');
      }
      return;
    }

    if (flags.logout) {
      gslides.logout();

      if (globalFlags.json) {
        output.json({ loggedOut: true });
        return;
      }

      output.success('Logged out from Google Slides');
      return;
    }

    if (!gslides.hasCredentials()) {
      output.error('Google credentials not configured.');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      return;
    }

    output.info('Starting Google authentication...');

    try {
      await gslides.authenticate();
      output.success('Successfully authenticated with Google Slides!');
    } catch (error) {
      output.error(`Authentication failed: ${error}`);
    }
  },
};
