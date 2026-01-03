/**
 * uni gmail auth - Authenticate
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Gmail',
  aliases: ['login'],
  options: [
    {
      name: 'status',
      short: 's',
      type: 'boolean',
      description: 'Check authentication status',
      default: false,
    },
  ],
  examples: [
    'uni gmail auth',
    'uni gmail auth --status',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.status) {
      if (globalFlags.json) {
        output.json({
          hasCredentials: gmail.hasCredentials(),
          isAuthenticated: gmail.isAuthenticated(),
        });
        return;
      }

      if (!gmail.hasCredentials()) {
        output.warn('Credentials not configured');
        return;
      }

      if (gmail.isAuthenticated()) {
        output.success('Authenticated with Gmail');
      } else {
        output.warn('Not authenticated. Run "uni gmail auth"');
      }
      return;
    }

    if (!gmail.hasCredentials()) {
      output.error('Google credentials not configured.');
      output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      return;
    }

    output.info('Starting Gmail authentication...');

    try {
      await gmail.authenticate();
      output.success('Successfully authenticated with Gmail!');
    } catch (error) {
      output.error('Authentication failed');
      throw error;
    }
  },
};
