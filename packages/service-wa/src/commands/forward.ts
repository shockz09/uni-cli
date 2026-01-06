/**
 * uni wa forward - Forward a message (runs via Node.js)
 */

import type { Command, CommandContext } from '@uni/shared';
import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';

export const forwardCommand: Command = {
  name: 'forward',
  description: 'Forward a message to another chat',
  args: [
    { name: 'fromChat', description: 'Source chat (phone number or "me")', required: true },
    { name: 'toChat', description: 'Destination chat', required: true },
    { name: 'messageId', description: 'Message ID to forward', required: true },
  ],
  examples: [
    'uni wa forward me 919876543210 ABC123',
    'uni wa forward 919876543210 me XYZ789',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args } = ctx;
    const script = path.join(os.homedir(), 'projects', 'uni-cli', 'packages', 'service-wa', 'wa-node.mjs');

    const child = spawn('node', [script, 'forward', args.fromChat as string, args.toChat as string, args.messageId as string], { stdio: 'inherit' });
    await new Promise<void>(r => child.on('close', r));
  },
};
