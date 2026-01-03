/**
 * uni gcontacts auth - Authenticate with Google Contacts
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcontacts } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Google Contacts',
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
    'uni gcontacts auth',
    'uni gcontacts auth --status',
    'uni gcontacts auth --logout',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.logout) {
      gcontacts.clearTokens();
      output.success('Logged out from Google Contacts');
      if (globalFlags.json) {
        output.json({ status: 'logged_out' });
      }
      return;
    }

    if (flags.status) {
      const authenticated = gcontacts.isAuthenticated();
      const hasCredentials = gcontacts.hasCredentials();

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
        output.success('Authenticated with Google Contacts');
      } else {
        output.warn('Not authenticated. Run "uni gcontacts auth"');
      }
      return;
    }

    // Authenticate
    if (!gcontacts.hasCredentials()) {
      output.error('Google credentials not configured');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      return;
    }

    output.info('Starting authentication...');

    try {
      await gcontacts.authenticate();
      output.success('Authenticated with Google Contacts!');
      if (globalFlags.json) {
        output.json({ status: 'authenticated' });
      }
    } catch (error) {
      output.error('Authentication failed');
      throw error;
    }
  },
};
