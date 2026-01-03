/**
 * uni gdrive auth
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';
import * as fs from 'node:fs';
import * as path from 'node:path';

const TOKEN_PATH = path.join(process.env.HOME || '~', '.uni/tokens/gdrive.json');

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Google Drive',
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
    'uni gdrive auth',
    'uni gdrive auth --status',
    'uni gdrive auth --logout',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    // Handle logout
    if (flags.logout) {
      try {
        if (fs.existsSync(TOKEN_PATH)) {
          fs.unlinkSync(TOKEN_PATH);
          output.success('Logged out from Google Drive');
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
          hasCredentials: gdrive.hasCredentials(),
          authenticated: gdrive.isAuthenticated(),
        });
        return;
      }
      if (gdrive.isAuthenticated()) {
        output.success('Authenticated with Google Drive');
      } else {
        output.warn('Not authenticated. Run "uni gdrive auth"');
      }
      return;
    }

    if (!gdrive.hasCredentials()) {
      output.error('Google credentials not configured.');
      console.log('');
      console.log('Quick setup (use default credentials):');
      console.log('  uni gdrive auth');
      console.log('');
      console.log('Or self-host your own credentials:');
      console.log('  uni setup google --self-host');
      console.log('');
      return;
    }

    output.info('Starting authentication...');
    await gdrive.authenticate();
    output.success('Authenticated with Google Drive!');
  },
};
