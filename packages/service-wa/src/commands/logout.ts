/**
 * uni wa logout - Clear WhatsApp session
 */

import type { Command, CommandContext } from '@uni/shared';
import * as fs from 'fs';
import * as path from 'path';
import { stopDaemon } from '../daemon-client';

const HOME = process.env.HOME || '~';
const AUTH_DIR = path.join(HOME, '.uni', 'tokens', 'whatsapp');

export const logoutCommand: Command = {
  name: 'logout',
  description: 'Clear WhatsApp session',
  examples: [
    'uni wa logout',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output } = ctx;

    // Stop daemon first
    await stopDaemon();

    // Clear session
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true });
        output.success('Logged out from WhatsApp');
      } else {
        console.log('Not logged in');
      }
    } catch (err) {
      output.error(`Failed to clear session: ${(err as Error).message}`);
    }
  },
};
