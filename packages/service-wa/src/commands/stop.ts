/**
 * uni wa stop - Stop the WhatsApp daemon
 */

import type { Command, CommandContext } from '@uni/shared';
import { stopDaemon, isDaemonRunning } from '../daemon-client';

export const stopCommand: Command = {
  name: 'stop',
  description: 'Stop the WhatsApp daemon',
  examples: [
    'uni wa stop',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output } = ctx;

    if (!isDaemonRunning()) {
      console.log('Daemon not running');
      return;
    }

    await stopDaemon();
    output.success('Daemon stopped');
  },
};
