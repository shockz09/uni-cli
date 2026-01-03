/**
 * uni gcal auth - Authenticate with Google Calendar
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Google Calendar',
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
    'uni gcal auth',
    'uni gcal auth --status',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.status) {
      if (globalFlags.json) {
        output.json({
          hasCredentials: gcal.hasCredentials(),
          isAuthenticated: gcal.isAuthenticated(),
        });
        return;
      }

      if (!gcal.hasCredentials()) {
        output.warn('Credentials not configured');
        output.info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
        output.info('Create credentials at: https://console.cloud.google.com/apis/credentials');
        return;
      }

      if (gcal.isAuthenticated()) {
        output.success('Authenticated with Google Calendar');
      } else {
        output.warn('Not authenticated. Run "uni gcal auth" to login.');
      }
      return;
    }

    if (!gcal.hasCredentials()) {
      output.error('Google Calendar credentials not configured.');
      console.log('');
      console.log('To set up Google Calendar:');
      console.log('');
      console.log('1. Go to https://console.cloud.google.com/apis/credentials');
      console.log('2. Create an OAuth 2.0 Client ID (Desktop app)');
      console.log('3. Enable the Google Calendar API');
      console.log('4. Set environment variables:');
      console.log('   export GOOGLE_CLIENT_ID="your-client-id"');
      console.log('   export GOOGLE_CLIENT_SECRET="your-client-secret"');
      console.log('');
      return;
    }

    output.info('Starting authentication flow...');
    output.info('A browser window will open for you to authorize access.');

    try {
      await gcal.authenticate();
      output.success('Successfully authenticated with Google Calendar!');
    } catch (error) {
      output.error('Authentication failed');
      throw error;
    }
  },
};
