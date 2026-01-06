/**
 * uni wa send - Send a message (runs via Node.js)
 */

import type { Command, CommandContext } from '@uni/shared';
import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';

export const sendCommand: Command = {
  name: 'send',
  description: 'Send a message',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
    { name: 'message', description: 'Message text', required: false },
  ],
  options: [
    { name: 'file', short: 'f', type: 'string', description: 'Attach file' },
    { name: 'reply', short: 'r', type: 'string', description: 'Reply to message ID' },
  ],
  examples: [
    'uni wa send me "Hello!"',
    'uni wa send 919876543210 "Hi"',
    'uni wa send me -f photo.jpg "Check this"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output } = ctx;
    const script = path.join(os.homedir(), 'projects', 'uni-cli', 'packages', 'service-wa', 'wa-node.mjs');

    const nodeArgs = ['send', args.chat as string, args.message as string || ''];
    if (flags.file) nodeArgs.push('-f', flags.file as string);
    if (flags.reply) nodeArgs.push('-r', flags.reply as string);

    const child = spawn('node', [script, ...nodeArgs], { stdio: 'inherit' });
    await new Promise<void>(r => child.on('close', r));
  },
};
