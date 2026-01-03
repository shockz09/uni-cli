/**
 * uni gdrive auth
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Google Drive',
  aliases: ['login'],
  options: [
    {
      name: 'status',
      short: 's',
      type: 'boolean',
      description: 'Check status',
      default: false,
    },
  ],
  examples: ['uni gdrive auth', 'uni gdrive auth --status'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.status) {
      if (globalFlags.json) {
        output.json({ authenticated: gdrive.isAuthenticated() });
        return;
      }
      if (gdrive.isAuthenticated()) {
        output.success('Authenticated with Google Drive');
      } else {
        output.warn('Not authenticated');
      }
      return;
    }

    if (!gdrive.hasCredentials()) {
      output.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      return;
    }

    output.info('Starting authentication...');
    await gdrive.authenticate();
    output.success('Authenticated with Google Drive!');
  },
};
