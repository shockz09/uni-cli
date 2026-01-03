/**
 * uni gforms auth - Authenticate with Google
 */

import type { Command, CommandContext } from '@uni/shared';
import { gforms } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Google Forms',
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
  examples: ['uni gforms auth', 'uni gforms auth --status', 'uni gforms auth --logout'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.status) {
      const authenticated = gforms.isAuthenticated();
      const hasCredentials = gforms.hasCredentials();

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
        output.success('Authenticated with Google Forms');
      } else {
        output.warn('Not authenticated. Run "uni gforms auth" to login.');
      }
      return;
    }

    if (flags.logout) {
      gforms.logout();

      if (globalFlags.json) {
        output.json({ loggedOut: true });
        return;
      }

      output.success('Logged out from Google Forms');
      return;
    }

    if (!gforms.hasCredentials()) {
      output.error('Google credentials not configured.');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      return;
    }

    output.info('Starting Google authentication...');

    try {
      await gforms.authenticate();
      output.success('Successfully authenticated with Google Forms!');
    } catch (error) {
      output.error(`Authentication failed: ${error}`);
    }
  },
};
