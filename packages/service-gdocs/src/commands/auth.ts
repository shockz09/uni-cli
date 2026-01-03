/**
 * uni gdocs auth - Authenticate with Google
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Google Docs',
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
  examples: ['uni gdocs auth', 'uni gdocs auth --status', 'uni gdocs auth --logout'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.status) {
      const authenticated = gdocs.isAuthenticated();
      const hasCredentials = gdocs.hasCredentials();

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
        output.success('Authenticated with Google Docs');
      } else {
        output.warn('Not authenticated. Run "uni gdocs auth" to login.');
      }
      return;
    }

    if (flags.logout) {
      gdocs.logout();

      if (globalFlags.json) {
        output.json({ loggedOut: true });
        return;
      }

      output.success('Logged out from Google Docs');
      return;
    }

    if (!gdocs.hasCredentials()) {
      output.error('Google credentials not configured.');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      output.info('Or run "uni setup google" for guided setup.');
      return;
    }

    output.info('Starting Google authentication...');

    try {
      await gdocs.authenticate();
      output.success('Successfully authenticated with Google Docs!');
    } catch (error) {
      output.error(`Authentication failed: ${error}`);
    }
  },
};
