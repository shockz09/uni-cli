/**
 * uni gmail auth - Authenticate
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';
import * as fs from 'node:fs';
import * as path from 'node:path';

const TOKEN_PATH = path.join(process.env.HOME || '~', '.uni/tokens/gmail.json');

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
    {
      name: 'logout',
      type: 'boolean',
      description: 'Remove authentication token',
      default: false,
    },
  ],
  examples: [
    'uni gmail auth',
    'uni gmail auth --status',
    'uni gmail auth --logout',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    // Handle logout
    if (flags.logout) {
      try {
        if (fs.existsSync(TOKEN_PATH)) {
          fs.unlinkSync(TOKEN_PATH);
          output.success('Logged out from Gmail');
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
          hasCredentials: gmail.hasCredentials(),
          isAuthenticated: gmail.isAuthenticated(),
        });
        return;
      }

      if (!gmail.hasCredentials()) {
        output.warn('Credentials not configured');
        output.info('Run "uni setup google" to configure');
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
      console.log('');
      console.log('Quick setup (use default credentials):');
      console.log('  uni gmail auth');
      console.log('');
      console.log('Or self-host your own credentials:');
      console.log('  uni setup google --self-host');
      console.log('');
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
