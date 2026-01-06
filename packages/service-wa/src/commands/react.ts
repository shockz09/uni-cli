/**
 * uni wa react - React to a message (runs via Node.js)
 */

import type { Command, CommandContext } from '@uni/shared';
import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';

export const reactCommand: Command = {
  name: 'react',
  description: 'React to a message with an emoji',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
    { name: 'messageId', description: 'Message ID to react to', required: true },
    { name: 'emoji', description: 'Emoji to react with (empty to remove)', required: false },
  ],
  examples: [
    'uni wa react me ABC123 "👍"',
    'uni wa react 919876543210 XYZ789 "❤️"',
    'uni wa react me ABC123 ""',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args } = ctx;
    const script = path.join(os.homedir(), 'projects', 'uni-cli', 'packages', 'service-wa', 'wa-node.mjs');

    const child = spawn('node', [script, 'react', args.chat as string, args.messageId as string, (args.emoji as string) || ''], { stdio: 'inherit' });
    await new Promise<void>(r => child.on('close', r));
  },
};
