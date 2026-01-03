/**
 * Google Auth Command Factory
 *
 * Creates a standardized auth command for any Google service.
 * Reduces 11 copy-pasted auth.ts files to one-liners.
 */

import type { Command, CommandContext } from './types';
import type { GoogleAuthClient } from './google-auth';

export interface GoogleAuthCommandOptions {
  /** Display name for the service (e.g., 'Calendar', 'Gmail') */
  serviceName: string;
  /** CLI key for the service (e.g., 'gcal', 'gmail') */
  serviceKey: string;
  /** The GoogleAuthClient instance for this service */
  client: GoogleAuthClient;
}

/**
 * Create a standardized auth command for a Google service.
 *
 * @example
 * ```typescript
 * import { createGoogleAuthCommand } from '@uni/shared';
 * import { gcal } from '../api';
 *
 * export const authCommand = createGoogleAuthCommand({
 *   serviceName: 'Calendar',
 *   serviceKey: 'gcal',
 *   client: gcal,
 * });
 * ```
 */
export function createGoogleAuthCommand(options: GoogleAuthCommandOptions): Command {
  const { serviceName, serviceKey, client } = options;

  return {
    name: 'auth',
    description: `Authenticate with Google ${serviceName}`,
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
      `uni ${serviceKey} auth`,
      `uni ${serviceKey} auth --status`,
      `uni ${serviceKey} auth --logout`,
    ],

    async handler(ctx: CommandContext): Promise<void> {
      const { output, flags, globalFlags } = ctx;

      // Handle logout
      if (flags.logout) {
        client.logout();
        output.success(`Logged out from Google ${serviceName}`);
        return;
      }

      // Handle status check
      if (flags.status) {
        if (globalFlags.json) {
          output.json({
            hasCredentials: client.hasCredentials(),
            isAuthenticated: client.isAuthenticated(),
          });
          return;
        }

        if (!client.hasCredentials()) {
          output.warn('Credentials not configured');
          output.info(`Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.`);
          return;
        }

        if (client.isAuthenticated()) {
          output.success(`Authenticated with Google ${serviceName}`);
        } else {
          output.warn(`Not authenticated. Run "uni ${serviceKey} auth" to login.`);
        }
        return;
      }

      // Handle auth flow
      if (!client.hasCredentials()) {
        output.error(`Google ${serviceName} credentials not configured.`);
        console.log('');
        console.log('Set these environment variables:');
        console.log('  GOOGLE_CLIENT_ID');
        console.log('  GOOGLE_CLIENT_SECRET');
        console.log('');
        return;
      }

      output.info('Starting authentication flow...');
      output.info('A browser window will open for you to authorize access.');

      try {
        await client.authenticate();
        output.success(`Successfully authenticated with Google ${serviceName}!`);
      } catch (error) {
        output.error('Authentication failed');
        throw error;
      }
    },
  };
}
