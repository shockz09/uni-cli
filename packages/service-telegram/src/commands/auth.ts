/**
 * uni telegram auth - Interactive authentication
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import {
  getCredentials,
  authenticateInteractive,
  saveSession,
  isAuthenticated,
} from '../client';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with Telegram (phone + OTP)',
  options: [
    {
      name: 'api-id',
      type: 'string',
      description: 'Telegram API ID (from my.telegram.org)',
    },
    {
      name: 'api-hash',
      type: 'string',
      description: 'Telegram API Hash (from my.telegram.org)',
    },
  ],
  examples: [
    'uni telegram auth',
    'uni telegram auth --api-id 12345 --api-hash abcdef123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags } = ctx;

    // Check if already authenticated
    if (isAuthenticated()) {
      console.log('');
      console.log(c.cyan('Already authenticated with Telegram.'));
      console.log(c.dim('Use `uni telegram logout` to clear session and re-authenticate.'));
      console.log('');
      return;
    }

    // Get credentials from flags, config, or env
    let apiId = flags['api-id'] as string | undefined;
    let apiHash = flags['api-hash'] as string | undefined;

    if (!apiId || !apiHash) {
      const creds = getCredentials();
      if (creds) {
        apiId = String(creds.apiId);
        apiHash = creds.apiHash;
      }
    }

    if (!apiId || !apiHash) {
      output.error('Telegram API credentials required.');
      console.log('');
      console.log('Get your API ID and Hash from: https://my.telegram.org');
      console.log('');
      console.log('Then either:');
      console.log('  1. Add to ~/.uni/config.toml:');
      console.log('     [telegram]');
      console.log('     api_id = "12345"');
      console.log('     api_hash = "abcdef..."');
      console.log('');
      console.log('  2. Or set environment variables:');
      console.log('     export TELEGRAM_API_ID="12345"');
      console.log('     export TELEGRAM_API_HASH="abcdef..."');
      console.log('');
      console.log('  3. Or pass as flags:');
      console.log('     uni telegram auth --api-id 12345 --api-hash abcdef...');
      console.log('');
      return;
    }

    console.log('');
    console.log(c.bold('Telegram Authentication'));
    console.log(c.dim('You will receive an OTP code via Telegram.'));
    console.log('');

    try {
      const sessionString = await authenticateInteractive(parseInt(apiId, 10), apiHash);

      if (sessionString) {
        saveSession(sessionString);
        console.log('');
        console.log(c.green('✓ Successfully authenticated!'));
        console.log(c.dim(`Session saved to ~/.uni/tokens/telegram.session`));
        console.log('');
      } else {
        output.error('Authentication failed.');
      }
    } catch (error) {
      output.error(`Authentication failed: ${(error as Error).message}`);
    }
  },
};
