/**
 * uni gcal auth - Authenticate with Google Calendar
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';
import * as fs from 'node:fs';
import * as path from 'node:path';

const TOKEN_PATH = path.join(process.env.HOME || '~', '.uni/tokens/gcal.json');

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
    {
      name: 'logout',
      type: 'boolean',
      description: 'Remove authentication token',
      default: false,
    },
  ],
  examples: [
    'uni gcal auth',
    'uni gcal auth --status',
    'uni gcal auth --logout',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    // Handle logout
    if (flags.logout) {
      try {
        if (fs.existsSync(TOKEN_PATH)) {
          fs.unlinkSync(TOKEN_PATH);
          output.success('Logged out from Google Calendar');
        } else {
          output.info('No authentication token found');
        }
      } catch (error) {
        output.error('Failed to remove token');
      }
      return;
    }

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
        output.info('Run "uni setup gcal" to configure, or set environment variables.');
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
      console.log('Quick setup (use default credentials):');
      console.log('  uni gcal auth');
      console.log('');
      console.log('Or self-host your own credentials:');
      console.log('  uni setup gcal --self-host');
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
