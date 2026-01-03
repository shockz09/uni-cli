/**
 * uni gsheets auth - Authenticate with Google
 */

import type { Command, CommandContext } from '@uni/shared';
import { gsheets } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Google Sheets',
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
  examples: [
    'uni gsheets auth',
    'uni gsheets auth --status',
    'uni gsheets auth --logout',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    // Handle --status
    if (flags.status) {
      const authenticated = gsheets.isAuthenticated();
      const hasCredentials = gsheets.hasCredentials();

      if (globalFlags.json) {
        output.json({
          authenticated,
          hasCredentials,
        });
        return;
      }

      if (!hasCredentials) {
        output.error('Google credentials not configured.');
        output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
        return;
      }

      if (authenticated) {
        output.success('Authenticated with Google Sheets');
      } else {
        output.warn('Not authenticated. Run "uni gsheets auth" to login.');
      }
      return;
    }

    // Handle --logout
    if (flags.logout) {
      gsheets.logout();

      if (globalFlags.json) {
        output.json({ loggedOut: true });
        return;
      }

      output.success('Logged out from Google Sheets');
      return;
    }

    // Check credentials
    if (!gsheets.hasCredentials()) {
      output.error('Google credentials not configured.');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      output.info('Or run "uni setup google" for guided setup.');
      return;
    }

    // Start OAuth flow
    output.info('Starting Google authentication...');

    try {
      await gsheets.authenticate();
      output.success('Successfully authenticated with Google Sheets!');
    } catch (error) {
      output.error(`Authentication failed: ${error}`);
    }
  },
};
