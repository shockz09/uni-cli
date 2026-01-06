/**
 * uni wa auth - Authenticate with WhatsApp
 * Runs interactively via Node (not through daemon)
 */

import type { Command, CommandContext } from '@uni/shared';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with WhatsApp (pairing code)',
  examples: [
    'uni wa auth',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output } = ctx;

    // Find daemon script
    const scriptPaths = [
      path.join(__dirname, '..', '..', '..', 'wa-daemon.mjs'),
      path.join(process.env.HOME || '~', 'projects', 'uni-cli', 'packages', 'service-wa', 'wa-daemon.mjs'),
    ];

    let scriptPath = '';
    for (const p of scriptPaths) {
      if (fs.existsSync(p)) {
        scriptPath = p;
        break;
      }
    }

    if (!scriptPath) {
      output.error('Daemon script not found');
      return;
    }

    // Run auth interactively
    const child = spawn('node', [scriptPath, 'auth'], {
      stdio: 'inherit',
      cwd: path.dirname(scriptPath),
    });

    await new Promise<void>((resolve) => {
      child.on('close', resolve);
    });
  },
};
