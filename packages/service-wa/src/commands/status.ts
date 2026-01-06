/**
 * uni wa status - Check daemon and connection status
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { isDaemonRunning, sendCommand } from '../daemon-client';

export const statusCommand: Command = {
  name: 'status',
  description: 'Check WhatsApp daemon status',
  examples: [
    'uni wa status',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, globalFlags } = ctx;

    const running = isDaemonRunning();

    if (!running) {
      if (globalFlags.json) {
        output.json({ daemon: false, connected: false });
      } else {
        console.log(`Daemon: ${c.red('not running')}`);
        console.log(c.dim('Run any command to start the daemon'));
      }
      return;
    }

    try {
      const result = await sendCommand({ action: 'status' });

      if (globalFlags.json) {
        output.json({
          daemon: true,
          connected: result.connected,
          user: result.user,
          uptime: result.uptime,
        });
      } else {
        console.log(`Daemon: ${c.green('running')}`);
        console.log(`Connected: ${result.connected ? c.green('yes') : c.red('no')}`);
        if (result.user) console.log(`User: ${result.user}`);
        if (result.uptime) console.log(`Uptime: ${Math.round(result.uptime)}s`);
      }
    } catch {
      if (globalFlags.json) {
        output.json({ daemon: true, connected: false, error: 'Failed to query' });
      } else {
        console.log(`Daemon: ${c.yellow('running but not responding')}`);
      }
    }
  },
};
